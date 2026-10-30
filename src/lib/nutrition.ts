export const NUTRITION_FIELDS = [
  { key: "protein", label: "Protein", unit: "g", max: 2_000 },
  { key: "carbs", label: "Carbs", unit: "g", max: 2_000 },
  { key: "fat", label: "Fat", unit: "g", max: 2_000 },
  { key: "saturatedFat", label: "Sat. fat", unit: "g", max: 500 },
  { key: "transFat", label: "Trans fat", unit: "g", max: 200 },
  { key: "fiber", label: "Fiber", unit: "g", max: 500 },
  { key: "sugar", label: "Sugar", unit: "g", max: 1_000 },
  { key: "sodium", label: "Sodium", unit: "mg", max: 20_000 },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", max: 5_000 },
  { key: "potassium", label: "Potassium", unit: "mg", max: 20_000 },
] as const;

export type DetailKey = (typeof NUTRITION_FIELDS)[number]["key"];

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
  potassium: number;
};

export type FoodItem = Nutrition & {
  name: string;
  serving: string;
};

export type PlateAnalysis = {
  name: string;
  serving: string;
  note: string;
  items: FoodItem[];
  nutrition: Nutrition;
};

const FIELD_MAX = new Map(NUTRITION_FIELDS.map((field) => [field.key, field.max]));

export function emptyNutrition(): Nutrition {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    saturatedFat: 0,
    transFat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
    potassium: 0,
  };
}

export function clampNutrient(key: keyof Nutrition, value: number) {
  const max = key === "calories" ? 20_000 : (FIELD_MAX.get(key as DetailKey) ?? 2_000);
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

export function nutritionFrom(value: Partial<Record<keyof Nutrition, unknown>> | null | undefined): Nutrition {
  const base = emptyNutrition();
  for (const key of Object.keys(base) as (keyof Nutrition)[]) {
    base[key] = clampNutrient(key, Number(value?.[key]));
  }
  return base;
}

export function sumNutrition(items: Nutrition[]): Nutrition {
  return items.reduce((sum, item) => {
    const next = { ...sum };
    for (const key of Object.keys(next) as (keyof Nutrition)[]) {
      next[key] = clampNutrient(key, sum[key] + item[key]);
    }
    return next;
  }, emptyNutrition());
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function itemFrom(value: unknown): FoodItem | null {
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

export function analysisFromModel(value: unknown): PlateAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("The photo reading came back empty.");
  }
  const record = value as Record<string, unknown>;
  if (record.ok === false) {
    const reason = cleanText(record.reason, 160);
    throw new Error(reason || "That photo does not look like food.");
  }
  const items = Array.isArray(record.items)
    ? record.items.map(itemFrom).filter((item): item is FoodItem => item !== null).slice(0, 12)
    : [];
  const nutrition = items.length > 0 ? sumNutrition(items) : nutritionFrom(record);
  if (!nutrition.calories && items.length === 0) {
    throw new Error("No food was readable in that photo.");
  }
  const name = cleanText(record.name, 80) || items[0]?.name || "Meal";
  return {
    name,
    serving: cleanText(record.serving, 80),
    note: cleanText(record.note, 180),
    items,
    nutrition: { ...nutrition, calories: nutrition.calories || sumNutrition(items).calories },
  };
}

export function nutritionFacts(entries: Nutrition[]) {
  return sumNutrition(entries);
}
