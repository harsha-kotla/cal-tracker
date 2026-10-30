import { addDays } from "@/lib/dates";
import { sumNutrition, type Nutrition } from "@/lib/nutrition";
import type { Entry, Meal, RecentFood } from "@/lib/types";

export type MacroTotals = Nutrition;

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

export function timeOf(entry: { createdAt?: { toMillis?: () => number } | null }) {
  const millis = entry.createdAt?.toMillis?.();
  return typeof millis === "number" ? millis : Number.MAX_SAFE_INTEGER;
}

export function totals(entries: Entry[]): MacroTotals {
  return sumNutrition(entries);
}

export function groupByMeal(entries: Entry[]): Record<Meal, Entry[]> {
  const grouped: Record<Meal, Entry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const entry of entries) {
    grouped[entry.meal].push(entry);
  }
  for (const meal of Object.keys(grouped) as Meal[]) {
    grouped[meal].sort((a, b) => timeOf(b) - timeOf(a));
  }
  return grouped;
}

export function caloriesByDate(entries: Entry[]) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.date, (map.get(entry.date) ?? 0) + entry.calories);
  }
  return map;
}

export function loggedDates(entries: Entry[]) {
  const dates = new Set<string>();
  for (const entry of entries) dates.add(entry.date);
  return dates;
}

export function loggingStreak(dates: Set<string>, today: string) {
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function recentFoods(entries: Entry[], limit = 8): RecentFood[] {
  const foods: RecentFood[] = [];
  const seen = new Set<string>();
  const sorted = [...entries].sort((a, b) => timeOf(b) - timeOf(a));
  for (const entry of sorted) {
    const name = entry.name.trim();
    if (!name) continue;
    const key = [name.toLowerCase(), entry.calories, entry.protein, entry.carbs, entry.fat, entry.meal].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    foods.push({
      name,
      serving: entry.serving,
      note: entry.note,
      meal: entry.meal,
      source: entry.source,
      items: entry.items,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      saturatedFat: entry.saturatedFat,
      transFat: entry.transFat,
      fiber: entry.fiber,
      sugar: entry.sugar,
      sodium: entry.sodium,
      cholesterol: entry.cholesterol,
      potassium: entry.potassium,
      nutritionFilled: entry.nutritionFilled,
    });
    if (foods.length >= limit) break;
  }
  return foods;
}

export function clampGoal(value: number) {
  if (!Number.isFinite(value)) return 2000;
  return Math.min(10_000, Math.max(500, Math.round(value)));
}
