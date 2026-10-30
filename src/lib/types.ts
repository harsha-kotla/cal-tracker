import type { Timestamp } from "firebase/firestore";
import type { FoodItem, Nutrition } from "@/lib/nutrition";

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export type Meal = (typeof MEALS)[number];

export type EntrySource = "photo" | "manual";

export type Entry = Nutrition & {
  id: string;
  name: string;
  serving: string;
  note: string;
  meal: Meal;
  date: string;
  source: EntrySource;
  items: FoodItem[];
  nutritionFilled: boolean;
  createdAt: Timestamp | null;
};

export type EntryInput = Omit<Entry, "id" | "createdAt">;

export type RecentFood = Omit<EntryInput, "date">;

export type Profile = {
  displayName: string;
  email: string;
  photoURL: string;
  calorieGoal: number;
};

export function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && (MEALS as readonly string[]).includes(value);
}

export function isSource(value: unknown): value is EntrySource {
  return value === "photo" || value === "manual";
}

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
