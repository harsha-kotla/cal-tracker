"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/errors";
import { clampGoal, formatNumber } from "@/lib/stats";
import type { Profile } from "@/lib/types";

const GOAL_PRESETS = [1500, 1800, 2000, 2200, 2500, 3000];

type ProfileScreenProps = {
  profile: Profile;
  onGoal: (goal: number) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function ProfileScreen({ profile, onGoal, onSignOut }: ProfileScreenProps) {
  const [draft, setDraft] = useState(String(profile.calorieGoal));
  const [seenGoal, setSeenGoal] = useState(profile.calorieGoal);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const name = profile.displayName.trim() || "Your log";

  if (!focused && profile.calorieGoal !== seenGoal) {
    setSeenGoal(profile.calorieGoal);
    setDraft(String(profile.calorieGoal));
  }

  async function commit(next: number) {
    const clamped = clampGoal(next);
    setDraft(String(clamped));
    setError(null);
    if (clamped === profile.calorieGoal) return;
    setSaving(true);
    try {
      await onGoal(clamped);
    } catch (err) {
      setDraft(String(profile.calorieGoal));
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function bump(amount: number) {
    const current = Number.parseInt(draft, 10);
    void commit((Number.isFinite(current) ? current : profile.calorieGoal) + amount);
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Settings</p>
      <h1 className="mt-2 font-serif text-[2rem] leading-none tracking-tight">Daily goal</h1>
      <p className="mt-2 text-sm leading-5 text-soft">Calories you want in a day. Today’s ring fills against this.</p>

      <section className="mt-6 rounded-[28px] bg-card p-5 ring-1 ring-line">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Decrease goal by 50"
            onClick={() => bump(-50)}
            disabled={saving}
            className="grid h-12 w-12 place-items-center rounded-full bg-paper text-xl ring-1 ring-line active:scale-95 disabled:opacity-50"
          >
            −
          </button>
          <label className="min-w-0 text-center">
            <input
              inputMode="numeric"
              aria-label="Calorie goal"
              value={draft}
              onFocus={(event) => {
                setFocused(true);
                event.target.select();
              }}
              onBlur={() => {
                setFocused(false);
                const parsed = Number.parseInt(draft, 10);
                void commit(Number.isFinite(parsed) ? parsed : profile.calorieGoal);
              }}
              onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              className="w-36 bg-transparent text-center font-serif text-5xl tabular-nums outline-none"
            />
            <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">kcal</span>
          </label>
          <button
            type="button"
            aria-label="Increase goal by 50"
            onClick={() => bump(50)}
            disabled={saving}
            className="grid h-12 w-12 place-items-center rounded-full bg-paper text-xl ring-1 ring-line active:scale-95 disabled:opacity-50"
          >
            +
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {GOAL_PRESETS.map((preset) => {
            const selected = profile.calorieGoal === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                disabled={saving}
                onClick={() => void commit(preset)}
                className={`h-10 rounded-full text-sm tabular-nums ${selected ? "bg-espresso text-cream" : "bg-paper text-soft ring-1 ring-line"} disabled:opacity-50`}
              >
                {formatNumber(preset)}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          {saving ? "Saving…" : `${formatNumber(profile.calorieGoal)} kcal saved. Anywhere from 500 to 10,000.`}
        </p>
        <p className="sr-only">Current goal {formatNumber(profile.calorieGoal)} calories</p>
      </section>

      <section className="mt-6 rounded-[28px] bg-card p-5 ring-1 ring-line">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Account</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={name} url={profile.photoURL} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">{name}</p>
            {profile.email ? <p className="mt-0.5 truncate text-sm text-muted">{profile.email}</p> : null}
          </div>
        </div>
      </section>

      {error ? <p className="mt-4 text-center text-sm text-heat">{error}</p> : null}

      <button
        type="button"
        onClick={() => {
          setSigningOut(true);
          void onSignOut().catch((err) => {
            setError(friendlyError(err));
            setSigningOut(false);
          });
        }}
        disabled={signingOut}
        className="mt-8 flex h-12 w-full items-center justify-center rounded-full text-sm font-medium ring-1 ring-line active:scale-[0.99] disabled:opacity-60"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
      <p className="mt-6 text-center text-xs leading-5 text-muted">
        Meals stay in your Firebase project, visible only to this Google account.
      </p>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  if (!url || failed) {
    return (
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-espresso font-serif text-2xl text-cream">
        {initial}
      </div>
    );
  }
  return (
    // Google profile photos are already hosted and should not pass through the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-full object-cover"
    />
  );
}
