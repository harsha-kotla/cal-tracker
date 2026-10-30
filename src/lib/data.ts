import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getDb } from "@/lib/firebase";
import { todayKey } from "@/lib/dates";
import { hasNutritionDetails, nutritionFrom, type FoodItem } from "@/lib/nutrition";
import { isMeal, isSource, type Entry, type EntryInput } from "@/lib/types";

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function sanitizeItem(value: unknown): FoodItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = cleanText(record.name, 80);
  if (!name) return null;
  return {
    name,
    serving: cleanText(record.serving, 80),
    ...nutritionFrom(record),
  };
}

function sanitize(input: EntryInput) {
  const name = cleanText(input.name, 80);
  if (!name) throw new Error("Name this food.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("That date is not valid.");
  if (!isMeal(input.meal)) throw new Error("Pick a meal.");
  const nutrition = nutritionFrom(input);
  return {
    name,
    serving: cleanText(input.serving, 80),
    note: cleanText(input.note, 180),
    meal: input.meal,
    date: input.date,
    source: input.source === "photo" ? "photo" : "manual",
    items: (input.items ?? []).map(sanitizeItem).filter((item): item is FoodItem => item !== null).slice(0, 12),
    nutritionFilled: input.nutritionFilled === true || hasNutritionDetails(nutrition),
    ...nutrition,
  };
}

export function toEntry(snapshot: QueryDocumentSnapshot): Entry {
  const data = snapshot.data();
  const items = Array.isArray(data.items)
    ? data.items.map(sanitizeItem).filter((item): item is FoodItem => item !== null)
    : [];
  const nutrition = nutritionFrom(data);
  return {
    id: snapshot.id,
    name: cleanText(data.name, 80),
    serving: cleanText(data.serving, 80),
    note: cleanText(data.note, 180),
    meal: isMeal(data.meal) ? data.meal : "snack",
    date: typeof data.date === "string" ? data.date : todayKey(),
    source: isSource(data.source) ? data.source : "manual",
    items,
    nutritionFilled: data.nutritionFilled === true || hasNutritionDetails(nutrition),
    createdAt: data.createdAt && typeof data.createdAt.toMillis === "function" ? data.createdAt : null,
    ...nutrition,
  };
}

export function entryToInput(entry: Entry): EntryInput {
  return {
    name: entry.name,
    serving: entry.serving,
    note: entry.note,
    meal: entry.meal,
    date: entry.date,
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
  };
}

function entriesCollection(uid: string) {
  return collection(getDb(), "users", uid, "entries");
}

export async function createEntry(uid: string, input: EntryInput) {
  const ref = await addDoc(entriesCollection(uid), {
    ...sanitize(input),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEntry(uid: string, id: string, input: EntryInput) {
  await updateDoc(doc(getDb(), "users", uid, "entries", id), sanitize(input));
}

export async function deleteEntry(uid: string, id: string) {
  await deleteDoc(doc(getDb(), "users", uid, "entries", id));
}

export async function ensureProfile(user: User) {
  const ref = doc(getDb(), "users", user.uid);
  const snapshot = await getDoc(ref);
  const identity = {
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
  };
  if (!snapshot.exists()) {
    await setDoc(ref, {
      ...identity,
      calorieGoal: 2000,
      createdAt: serverTimestamp(),
    });
    return;
  }
  await setDoc(ref, identity, { merge: true });
}

export async function updateCalorieGoal(uid: string, calorieGoal: number) {
  const goal = Math.min(10_000, Math.max(500, Math.round(calorieGoal)));
  await updateDoc(doc(getDb(), "users", uid), { calorieGoal: goal });
}
