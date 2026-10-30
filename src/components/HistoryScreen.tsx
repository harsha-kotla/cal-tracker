"use client";

import { formatMonthDay, formatNarrowWeekday, formatShortDay, formatWeekday, rangeKeys } from "@/lib/dates";
import { caloriesByDate, formatNumber } from "@/lib/stats";
import type { Entry } from "@/lib/types";

type HistoryScreenProps = {
  today: string;
  goal: number;
  entries: Entry[];
  selectedDate: string;
  onOpenDay: (date: string) => void;
};

export function HistoryScreen({ today, goal, entries, selectedDate, onOpenDay }: HistoryScreenProps) {
  const byDate = caloriesByDate(entries);
  const span = rangeKeys(today, 60);
  const week = span.slice(-7);
  const earlier = span
    .slice(0, -7)
    .reverse()
    .filter((key) => (byDate.get(key) ?? 0) > 0);
  const weekTotals = week.map((key) => byDate.get(key) ?? 0);
  const average = Math.round(weekTotals.reduce((sum, value) => sum + value, 0) / 7);
  const scale = Math.max(goal, ...weekTotals, 1);
  const loggedThisWeek = weekTotals.some((value) => value > 0);

  return (
    <div className="px-5 pt-6 pb-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">History</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="font-serif text-[2rem] leading-none tracking-tight">This week</h1>
        <p className="pb-1 text-sm tabular-nums text-muted">
          {average > 0 ? `${formatNumber(average)} avg` : "No days yet"}
        </p>
      </div>

      <div className="mt-6 flex h-40 items-end justify-between gap-2">
        {week.map((key) => {
          const calories = byDate.get(key) ?? 0;
          const height = calories === 0 ? 6 : Math.max(10, (calories / scale) * 100);
          const over = calories > goal;
          const selected = key === selectedDate;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenDay(key)}
              aria-label={`${formatWeekday(key)}, ${formatMonthDay(key)}, ${formatNumber(calories)} calories`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="flex h-32 w-full items-end justify-center">
                <span
                  className={`w-full max-w-8 rounded-full ${
                    calories === 0 ? "bg-line" : over ? "bg-ember" : selected ? "bg-espresso" : "bg-ink/75"
                  }`}
                  style={{ height: calories === 0 ? 6 : `${height}%` }}
                />
              </span>
              <span className={`text-[11px] ${selected ? "font-medium text-ink" : "text-muted"}`}>
                {formatNarrowWeekday(key)}
              </span>
            </button>
          );
        })}
      </div>

      {loggedThisWeek ? (
        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-espresso" />
            Under goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ember" />
            Over
          </span>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">Log a meal and this week will start to take shape.</p>
      )}

      {earlier.length === 0 && loggedThisWeek ? (
        <p className="mt-10 text-center text-sm leading-6 text-muted">Days before this week will collect here.</p>
      ) : null}

      {earlier.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Earlier</h2>
          <ul className="mt-2">
            {earlier.map((key) => {
              const calories = byDate.get(key) ?? 0;
              const width = Math.min(100, Math.round((calories / Math.max(goal, 1)) * 100));
              const selected = key === selectedDate;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onOpenDay(key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left active:bg-card ${
                      selected ? "bg-card" : ""
                    }`}
                  >
                    <span className="w-14 shrink-0 text-sm text-soft">{formatShortDay(key)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <span
                        className={`block h-full rounded-full ${calories > goal ? "bg-ember" : "bg-espresso"}`}
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span
                      className={`w-14 shrink-0 text-right text-sm tabular-nums ${calories > goal ? "text-heat" : "text-ink"}`}
                    >
                      {formatNumber(calories)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
