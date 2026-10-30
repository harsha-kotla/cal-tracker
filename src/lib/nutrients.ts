import { nutritionFrom, type NutrientFill } from "@/lib/nutrition";

export async function fillNutrients(
  foods: { id: string; name: string; serving: string; calories: number }[],
  token: string,
) {
  const response = await fetch("/api/nutrients", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ foods }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string; foods?: unknown } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Nutrients could not be updated.");
  }
  const rows = Array.isArray(payload?.foods) ? payload.foods : [];
  const fills: NutrientFill[] = rows.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { id?: unknown; nutrition?: Record<string, unknown> };
    if (typeof record.id !== "string" || !record.id) return [];
    return [{ id: record.id, nutrition: nutritionFrom(record.nutrition) }];
  });
  if (!fills.length) throw new Error("The nutrient reading came back empty.");
  return fills;
}
