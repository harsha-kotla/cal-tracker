import type { PlateAnalysis } from "@/lib/nutrition";

export async function analyzePhoto(blob: Blob, token: string) {
  const body = new FormData();
  body.append("image", blob, "meal.jpg");
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | PlateAnalysis | null;
  if (!response.ok) {
    const message = payload && "error" in payload ? payload.error : "";
    throw new Error(message || "Could not read that photo.");
  }
  if (!payload || !("nutrition" in payload)) throw new Error("Could not read that photo.");
  return payload;
}
