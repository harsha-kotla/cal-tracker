import { NUTRITION_FIELDS, type DetailKey, type FoodItem, type PlateAnalysis } from "@/lib/nutrition";
import type { Entry, EntryInput, Meal } from "@/lib/types";

export type LogDraft = {
  id?: string;
  name: string;
  serving: string;
  note: string;
  calories: string;
  details: Record<DetailKey, string>;
  meal: Meal;
  date: string;
  source: "photo" | "manual";
  items: FoodItem[];
};

function blankDetails(): Record<DetailKey, string> {
  return Object.fromEntries(NUTRITION_FIELDS.map((field) => [field.key, ""])) as Record<DetailKey, string>;
}

function detailsFrom(entry: Pick<Entry, DetailKey>): Record<DetailKey, string> {
  return Object.fromEntries(
    NUTRITION_FIELDS.map((field) => [field.key, entry[field.key] ? String(entry[field.key]) : ""]),
  ) as Record<DetailKey, string>;
}

export function blankDraft(date: string, meal: Meal): LogDraft {
  return {
    name: "",
    serving: "",
    note: "",
    calories: "",
    details: blankDetails(),
    meal,
    date,
    source: "manual",
    items: [],
  };
}

export function draftFromEntry(entry: Entry): LogDraft {
  return {
    id: entry.id,
    name: entry.name,
    serving: entry.serving,
    note: entry.note,
    calories: String(entry.calories),
    details: detailsFrom(entry),
    meal: entry.meal,
    date: entry.date,
    source: entry.source,
    items: entry.items,
  };
}

export function draftFromAnalysis(analysis: PlateAnalysis, date: string, meal: Meal): LogDraft {
  return {
    name: analysis.name,
    serving: analysis.serving,
    note: analysis.note,
    calories: String(analysis.nutrition.calories),
    details: detailsFrom(analysis.nutrition),
    meal,
    date,
    source: "photo",
    items: analysis.items,
  };
}

function parseDetail(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function inputFromDraft(draft: Omit<LogDraft, "id" | "calories"> & { calories: number }): EntryInput {
  const details = Object.fromEntries(
    NUTRITION_FIELDS.map((field) => [field.key, parseDetail(draft.details[field.key])]),
  ) as Record<DetailKey, number>;
  return {
    name: draft.name,
    serving: draft.serving,
    note: draft.note,
    meal: draft.meal,
    date: draft.date,
    source: draft.source,
    items: draft.items,
    calories: draft.calories,
    ...details,
  };
}
