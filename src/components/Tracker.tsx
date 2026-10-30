"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { analyzePhoto } from "@/lib/analyze";
import { addDays, daysBetween, formatShortDay, mealForNow, todayKey } from "@/lib/dates";
import { createEntry, deleteEntry, entryToInput, updateEntry } from "@/lib/data";
import { blankDraft, draftFromAnalysis, draftFromEntry, type LogDraft } from "@/lib/draft";
import { friendlyError } from "@/lib/errors";
import { compressPhoto } from "@/lib/image";
import { needsNutritionFill } from "@/lib/nutrition";
import { fillNutrients } from "@/lib/nutrients";
import { loggedDates, loggingStreak, recentFoods } from "@/lib/stats";
import type { Entry, EntryInput, Meal, RecentFood } from "@/lib/types";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { EntrySheet } from "@/components/EntrySheet";
import { HistoryScreen } from "@/components/HistoryScreen";
import { Camera } from "@/components/icons";
import { ProfileScreen } from "@/components/ProfileScreen";
import { TodayScreen } from "@/components/TodayScreen";
import { useAuth } from "@/context/AuthProvider";
import { useFoodLog } from "@/hooks/useFoodLog";

type ToastState = {
  id: number;
  message: string;
  onAction?: () => Promise<void> | void;
};

function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const tick = () => {
      const next = todayKey();
      setToday((current) => (current === next ? current : next));
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return today;
}

export function Tracker() {
  const { user, profile, notice, clearNotice, setCalorieGoal, signOutUser } = useAuth();
  const today = useToday();
  const { entries, loading, error } = useFoodLog(user?.uid, today);
  const [tab, setTab] = useState<Tab>("today");
  const [dayOffset, setDayOffset] = useState(0);
  const [sheet, setSheet] = useState<LogDraft | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skippedFills, setSkippedFills] = useState<string[]>([]);
  const toastTimer = useRef<number | null>(null);
  const quickLock = useRef(false);
  const fillLock = useRef(false);
  const selectedDate = addDays(today, dayOffset);

  const dayEntries = useMemo(
    () => entries.filter((entry) => entry.date === selectedDate),
    [entries, selectedDate],
  );
  const recent = useMemo(() => recentFoods(entries), [entries]);
  const streak = useMemo(() => loggingStreak(loggedDates(entries), today), [entries, today]);
  const banner = error ?? notice;
  const fillingNutrition = dayEntries.some(
    (entry) => needsNutritionFill(entry) && !skippedFills.includes(entry.id) && entry.id !== sheet?.id,
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!user || loading || fillLock.current) return;
    const missing = dayEntries.filter(
      (entry) => needsNutritionFill(entry) && !skippedFills.includes(entry.id) && entry.id !== sheet?.id,
    );
    if (!missing.length) return;
    fillLock.current = true;
    const ids = missing.map((entry) => entry.id);
    void (async () => {
      try {
        const token = await user.getIdToken();
        const fills = await fillNutrients(
          missing.map((entry) => ({
            id: entry.id,
            name: entry.name,
            serving: entry.serving,
            calories: entry.calories,
          })),
          token,
        );
        const byId = new Map(fills.map((fill) => [fill.id, fill.nutrition]));
        await Promise.all(
          missing.flatMap((entry) => {
            const nutrition = byId.get(entry.id);
            if (!nutrition) return [];
            return [
              updateEntry(user.uid, entry.id, {
                ...entryToInput(entry),
                ...nutrition,
                calories: entry.calories > 0 ? entry.calories : nutrition.calories,
                nutritionFilled: true,
              }),
            ];
          }),
        );
        const missed = ids.filter((id) => !byId.has(id));
        if (missed.length) setSkippedFills((current) => [...current, ...missed]);
      } catch (err) {
        setSkippedFills((current) => [...current, ...ids]);
        showToast(err instanceof Error ? err.message : "Nutrients could not be updated.");
      } finally {
        fillLock.current = false;
      }
    })();
  }, [dayEntries, loading, sheet?.id, skippedFills, user]);

  function showToast(message: string, onAction?: () => Promise<void> | void) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const id = Date.now();
    setToast({ id, message, onAction });
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4200);
  }

  function closeSheet() {
    setSheet(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function openCreate(meal?: Meal) {
    closeSheet();
    setSheet(blankDraft(selectedDate, meal ?? mealForNow()));
  }

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user || scanning) return;
    setScanning(true);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return localUrl;
    });
    try {
      const blob = await compressPhoto(file);
      const token = await user.getIdToken();
      const analysis = await analyzePhoto(blob, token);
      setSheet(draftFromAnalysis(analysis, selectedDate, mealForNow()));
    } catch (err) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      showToast(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setScanning(false);
    }
  }

  async function save(input: EntryInput & { id?: string }) {
    if (!user) return;
    if (input.id) await updateEntry(user.uid, input.id, input);
    else await createEntry(user.uid, input);
    closeSheet();
  }

  async function remove(entry: Entry) {
    if (!user) return;
    await deleteEntry(user.uid, entry.id);
    showToast(`Removed ${entry.name}`, async () => {
      await createEntry(user.uid, entryToInput(entry));
    });
  }

  async function quickAdd(food: RecentFood) {
    if (!user || quickLock.current) return;
    quickLock.current = true;
    try {
      const id = await createEntry(user.uid, { ...food, date: selectedDate });
      showToast(`Added ${food.name}`, async () => {
        await deleteEntry(user.uid, id);
      });
    } catch (err) {
      showToast(friendlyError(err));
    } finally {
      quickLock.current = false;
    }
  }

  function openDay(date: string) {
    setDayOffset(daysBetween(today, date));
    setTab("today");
  }

  if (!user || !profile) return null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {banner ? (
          <div className="px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#f8e8e3] px-4 py-3 text-sm text-heat">
              <p>{banner}</p>
              {notice ? (
                <button type="button" aria-label="Dismiss" onClick={clearNotice} className="text-lg leading-none">
                  ×
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <main
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${banner ? "" : "pt-[env(safe-area-inset-top)]"}`}
        >
          {tab === "today" ? (
            <TodayScreen
              selectedDate={selectedDate}
              dayOffset={dayOffset}
              streak={streak}
              goal={profile.calorieGoal}
              entries={dayEntries}
              recent={recent}
              loading={loading}
              onOffset={setDayOffset}
              onAdd={openCreate}
              onEdit={(entry) => setSheet(draftFromEntry(entry))}
              onRemove={(entry) => {
                void remove(entry).catch((err) => showToast(friendlyError(err)));
              }}
              onQuickAdd={(food) => void quickAdd(food)}
              onOpenSettings={() => setTab("settings")}
              fillingNutrition={fillingNutrition}
            />
          ) : null}
          {tab === "history" ? (
            <HistoryScreen
              today={today}
              goal={profile.calorieGoal}
              entries={entries}
              selectedDate={selectedDate}
              onOpenDay={openDay}
            />
          ) : null}
          {tab === "settings" ? (
            <ProfileScreen profile={profile} onGoal={setCalorieGoal} onSignOut={signOutUser} />
          ) : null}
        </main>
        <footer className="relative shrink-0 bg-paper pb-[env(safe-area-inset-bottom)]">
          {toast ? (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-x-4 bottom-full z-20 mb-3 flex items-center justify-between gap-3 rounded-2xl bg-espresso px-4 py-3 text-sm text-cream shadow-lg"
            >
              <p className="min-w-0 flex-1">{toast.message}</p>
              {toast.onAction ? (
                <button
                  type="button"
                  className="shrink-0 font-medium text-ember"
                  onClick={() => {
                    const action = toast.onAction;
                    setToast(null);
                    void Promise.resolve(action?.()).catch((err) => showToast(friendlyError(err)));
                  }}
                >
                  Undo
                </button>
              ) : null}
            </div>
          ) : null}
          {tab === "today" ? (
            <div className="px-5 pt-2 pb-2">
              {dayOffset !== 0 ? (
                <p className="mb-2 text-center text-xs text-muted">Logging {formatShortDay(selectedDate)}</p>
              ) : null}
              <label
                className={`relative flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-espresso text-[15px] font-medium text-cream active:scale-[0.99] ${scanning ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={scanning}
                  aria-label="Take a food photo"
                  onChange={(event) => void onPhoto(event)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <Camera className="h-4 w-4" />
                {scanning ? "Reading the plate…" : "Scan food"}
              </label>
              <div className="mt-2 flex items-center justify-center gap-5 text-sm">
                <label className={`relative inline-block font-medium text-soft ${scanning ? "pointer-events-none opacity-50" : ""}`}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={scanning}
                    aria-label="Choose a food photo"
                    onChange={(event) => void onPhoto(event)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  Photo library
                </label>
                <button type="button" onClick={() => openCreate()} disabled={scanning} className="font-medium text-soft disabled:opacity-50">
                  Type it
                </button>
              </div>
            </div>
          ) : null}
          <BottomNav tab={tab} onChange={setTab} />
        </footer>
      </div>
      {scanning && previewUrl ? (
        <div className="absolute inset-0 z-40 bg-espresso">
          {/* Local camera preview while the photo is read. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="relative grid h-full place-items-center px-8 text-center text-cream">
            <div>
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
              <p className="mt-4 font-serif text-3xl tracking-tight">Reading the plate</p>
            </div>
          </div>
        </div>
      ) : null}
      {sheet ? (
        <EntrySheet
          key={`${sheet.id ?? "new"}-${sheet.date}-${sheet.meal}-${sheet.name}`}
          initial={sheet}
          today={today}
          previewUrl={sheet.source === "photo" ? previewUrl : null}
          onClose={closeSheet}
          onSave={save}
          onDelete={
            sheet.id
              ? async () => {
                  const entry = entries.find((item) => item.id === sheet.id);
                  if (!entry) return;
                  await remove(entry);
                  closeSheet();
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
