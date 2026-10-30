"use client";

import { formatMonthDay, formatWeekday } from "@/lib/dates";
import { formatNumber, groupByMeal, totals } from "@/lib/stats";
import { MEALS, MEAL_LABELS, type Entry, type Meal, type RecentFood } from "@/lib/types";
import { CalorieRing } from "@/components/CalorieRing";
import { ChevronLeft, ChevronRight, Plus, Trash } from "@/components/icons";

type TodayScreenProps = {
  selectedDate: string;
  dayOffset: number;
  streak: number;
  goal: number;
  entries: Entry[];
  recent: RecentFood[];
  loading: boolean;
  onOffset: (offset: number) => void;
  onAdd: (meal: Meal) => void;
  onEdit: (entry: Entry) => void;
  onRemove: (entry: Entry) => void;
  onQuickAdd: (food: RecentFood) => void;
  onOpenSettings: () => void;
  fillingNutrition: boolean;
};

export function TodayScreen({
  selectedDate,
  dayOffset,
  streak,
  goal,
  entries,
  recent,
  loading,
  onOffset,
  onAdd,
  onEdit,
  onRemove,
  onQuickAdd,
  onOpenSettings,
  fillingNutrition,
}: TodayScreenProps) {
  const summed = totals(entries);
  const grouped = groupByMeal(entries);
  const eyebrow =
    dayOffset === 0
      ? streak > 0
        ? `Today · ${streak}-day streak`
        : "Today"
      : formatWeekday(selectedDate);

  return (
    <div className="px-5 pt-4 pb-8">
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => onOffset(Math.max(-120, dayOffset - 1))}
          className="grid h-11 w-11 place-items-center rounded-full bg-card ring-1 ring-line active:scale-95"
        >
          <ChevronLeft />
        </button>
        <div className="min-w-0 px-2 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
          <h1 className="mt-1 truncate font-serif text-[1.7rem] leading-none tracking-tight">
            {formatMonthDay(selectedDate)}
          </h1>
          {dayOffset !== 0 ? (
            <button type="button" onClick={() => onOffset(0)} className="mt-1 text-xs font-medium text-ember">
              Back to today
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Next day"
          disabled={dayOffset >= 0}
          onClick={() => onOffset(Math.min(0, dayOffset + 1))}
          className="grid h-11 w-11 place-items-center rounded-full bg-card ring-1 ring-line active:scale-95 disabled:opacity-30"
        >
          <ChevronRight />
        </button>
      </div>

      {loading && entries.length === 0 ? (
        <div className="mt-5 h-[300px] animate-pulse rounded-[28px] bg-line/80" />
      ) : (
        <section className="mt-5 rounded-[28px] bg-espresso px-4 pt-5 pb-4 text-cream shadow-[0_18px_40px_rgba(27,25,20,0.16)]">
          <CalorieRing eaten={summed.calories} goal={goal} onEditGoal={onOpenSettings} />
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3">
            <Macro label="Protein" value={summed.protein} />
            <Macro label="Carbs" value={summed.carbs} />
            <Macro label="Fat" value={summed.fat} />
          </div>
          <p className="mt-3 text-center text-[11px] tabular-nums text-cream/60">
            {fillingNutrition
              ? "Filling in protein and the other nutrients…"
              : `Fiber ${formatNumber(summed.fiber)}g · Sugar ${formatNumber(summed.sugar)}g · Sodium ${formatNumber(summed.sodium)}mg`}
          </p>
        </section>
      )}

      {recent.length > 0 ? (
        <section className="mt-6">
          <h2 className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Have it again</h2>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
            {recent.map((food) => (
              <button
                key={`${food.name}-${food.calories}-${food.meal}`}
                type="button"
                onClick={() => onQuickAdd(food)}
                className="w-[148px] shrink-0 rounded-[20px] bg-card px-3.5 py-3 text-left ring-1 ring-line active:scale-[0.98]"
              >
                <span className="block truncate text-sm font-medium">{food.name}</span>
                <span className="mt-0.5 block text-xs text-muted tabular-nums">
                  {formatNumber(food.calories)} kcal · {MEAL_LABELS[food.meal]}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 space-y-5">
        {MEALS.map((meal) => {
          const items = grouped[meal];
          const mealTotal = items.reduce((sum, item) => sum + item.calories, 0);
          return (
            <section key={meal}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{MEAL_LABELS[meal]}</h2>
                {mealTotal > 0 ? (
                  <p className="text-sm tabular-nums text-soft">{formatNumber(mealTotal)}</p>
                ) : null}
              </div>
              {items.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onAdd(meal)}
                  className="flex h-12 w-full items-center justify-between rounded-[22px] bg-card px-4 text-sm text-muted ring-1 ring-line active:scale-[0.99]"
                >
                  <span>Add food</span>
                  <Plus className="h-4 w-4 text-ink" />
                </button>
              ) : (
                <ul className="overflow-hidden rounded-[22px] bg-card ring-1 ring-line">
                  {items.map((entry) => {
                    const hasMacros = entry.protein + entry.carbs + entry.fat > 0;
                    return (
                      <li key={entry.id} className="flex items-stretch border-b border-line">
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{entry.name}</span>
                            {entry.items.length > 1 ? (
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {entry.items.map((item) => item.name).join(", ")}
                              </span>
                            ) : entry.serving ? (
                              <span className="mt-0.5 block truncate text-xs text-muted">{entry.serving}</span>
                            ) : hasMacros ? (
                              <span className="mt-0.5 block text-xs text-muted">
                                {entry.protein}p · {entry.carbs}c · {entry.fat}f
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular-nums text-[15px]">{formatNumber(entry.calories)}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${entry.name}`}
                          onClick={() => onRemove(entry)}
                          className="grid w-11 place-items-center text-muted active:text-heat"
                        >
                          <Trash />
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      type="button"
                      onClick={() => onAdd(meal)}
                      className="flex h-12 w-full items-center justify-between px-4 text-sm font-medium text-ember"
                    >
                      Add another
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-serif text-[1.35rem] leading-none tabular-nums">{formatNumber(value)}g</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cream/50">{label}</p>
    </div>
  );
}
