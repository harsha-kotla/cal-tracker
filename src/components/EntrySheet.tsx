"use client";

import { useEffect, useId, useState } from "react";
import { formatShortDay } from "@/lib/dates";
import { inputFromDraft, type LogDraft } from "@/lib/draft";
import { friendlyError } from "@/lib/errors";
import { NUTRITION_FIELDS, type DetailKey } from "@/lib/nutrition";
import { MEALS, MEAL_LABELS, type EntryInput, type Meal } from "@/lib/types";
import { Close } from "@/components/icons";

type EntrySheetProps = {
  initial: LogDraft;
  today: string;
  previewUrl?: string | null;
  onClose: () => void;
  onSave: (input: EntryInput & { id?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function digits(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 5);
}

function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(Math.max(0, Math.round(overlap)));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

export function EntrySheet({ initial, today, previewUrl, onClose, onSave, onDelete }: EntrySheetProps) {
  const titleId = useId();
  const inset = useKeyboardInset();
  const [name, setName] = useState(initial.name);
  const [serving, setServing] = useState(initial.serving);
  const [calories, setCalories] = useState(initial.calories);
  const [details, setDetails] = useState(initial.details);
  const [meal, setMeal] = useState<Meal>(initial.meal);
  const [showFacts, setShowFacts] = useState(
    initial.source === "photo" || NUTRITION_FIELDS.some((field) => initial.details[field.key]),
  );
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setDetail(key: DetailKey, value: string) {
    setDetails((current) => ({ ...current, [key]: digits(value) }));
  }

  async function submit() {
    setAttempted(true);
    if (!name.trim() || calories.trim() === "") return;
    const parsedCalories = Number.parseInt(calories, 10);
    if (!Number.isFinite(parsedCalories)) return;
    setSaving(true);
    setError(null);
    try {
      const input = inputFromDraft({
        ...initial,
        name,
        serving,
        calories: parsedCalories,
        details,
        meal,
      });
      await onSave({ ...input, id: initial.id });
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(friendlyError(err));
      setDeleting(false);
    }
  }

  const dateLabel = initial.date === today ? "Today" : formatShortDay(initial.date);
  const title = initial.id ? "Edit food" : initial.source === "photo" ? "From the photo" : "Log food";

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" style={{ paddingBottom: inset }}>
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close log" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        onClick={(event) => event.stopPropagation()}
        className="sheet-rise relative flex max-h-[92%] flex-col rounded-t-[28px] bg-paper"
      >
        <div className="overflow-y-auto overscroll-contain px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{dateLabel}</p>
              <h2 id={titleId} className="mt-1 font-serif text-[1.7rem] leading-none tracking-tight">
                {title}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line"
            >
              <Close />
            </button>
          </div>

          {previewUrl ? (
            // The preview is a local camera shot, not a remote image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="mt-4 h-36 w-full rounded-[22px] object-cover" />
          ) : null}
          {initial.note ? <p className="mt-3 text-sm leading-5 text-soft">{initial.note}</p> : null}

          {initial.items.length > 0 ? (
            <ul className="mt-4 overflow-hidden rounded-[22px] bg-card ring-1 ring-line">
              {initial.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    {item.serving ? <span className="block truncate text-xs text-muted">{item.serving}</span> : null}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{item.calories}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <label className="mt-5 block">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Food</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              enterKeyHint="next"
              autoCapitalize="sentences"
              placeholder="Greek yogurt, oats, chicken bowl"
              className="mt-1 w-full border-b border-line bg-transparent py-2 text-base outline-none placeholder:text-muted/70 focus:border-ink"
            />
          </label>
          {attempted && !name.trim() ? <p className="mt-2 text-sm text-heat">Name this food.</p> : null}

          <label className="mt-4 block">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Portion</span>
            <input
              value={serving}
              onChange={(event) => setServing(event.target.value)}
              maxLength={80}
              enterKeyHint="next"
              placeholder="1 bowl, 2 slices"
              className="mt-1 w-full border-b border-line bg-transparent py-2 text-base outline-none placeholder:text-muted/70 focus:border-ink"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Calories</span>
            <span className="mt-1 flex items-end gap-2 border-b border-line focus-within:border-ink">
              <input
                value={calories}
                onChange={(event) => setCalories(digits(event.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                placeholder="0"
                className="w-full bg-transparent py-1 font-serif text-5xl tabular-nums outline-none placeholder:text-line"
              />
              <span className="pb-2 text-sm text-muted">kcal</span>
            </span>
          </label>
          {attempted && calories.trim() === "" ? <p className="mt-2 text-sm text-heat">Add the calories.</p> : null}
          {initial.source === "manual" ? (
            <p className="mt-3 text-sm leading-5 text-soft">
              Leave protein and the rest blank. Cal estimates them from the name after you save.
            </p>
          ) : null}

          <div className="mt-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Meal</p>
            <div role="radiogroup" aria-label="Meal" className="mt-2 grid grid-cols-4 gap-1 rounded-full bg-line/70 p-1">
              {MEALS.map((option) => {
                const selected = option === meal;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMeal(option)}
                    className={`h-10 min-w-0 truncate rounded-full px-1 text-[11px] font-medium ${selected ? "bg-espresso text-cream" : "text-soft"}`}
                  >
                    {MEAL_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={() => setShowFacts((open) => !open)} className="mt-4 text-sm font-medium text-soft">
            {showFacts ? "Hide nutrition facts" : "Nutrition facts"}
          </button>
          {showFacts ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {NUTRITION_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                    {field.label}
                    <span className="tracking-normal text-muted/80"> {field.unit}</span>
                  </span>
                  <input
                    value={details[field.key]}
                    onChange={(event) => setDetail(field.key, event.target.value)}
                    inputMode="numeric"
                    aria-label={`${field.label} in ${field.unit}`}
                    className="mt-1 w-full rounded-2xl bg-card px-3 py-2 text-base tabular-nums ring-1 ring-line outline-none focus:ring-ink"
                  />
                </label>
              ))}
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-heat">{error}</p> : null}
          <div className="h-4" />
        </div>
        <div className="px-5 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-espresso text-[15px] font-medium text-cream active:scale-[0.99] disabled:opacity-60"
          >
            {saving ? "Saving…" : initial.id ? "Save changes" : "Add to log"}
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving || deleting}
              className="mt-2 h-11 w-full text-sm font-medium text-heat disabled:opacity-60"
            >
              {deleting ? "Removing…" : "Delete entry"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
