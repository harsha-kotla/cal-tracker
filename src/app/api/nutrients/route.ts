import { nutrientsFromModel } from "@/lib/nutrition";
import { verifyFirebaseIdToken } from "@/lib/firebaseToken";

const MODEL = "gpt-4o-mini";

const PROMPT = `You estimate nutrition for foods that already have a name and a calorie count. Reply with JSON only:
{"foods":[{"id":"","name":"","calories":0,"protein":0,"carbs":0,"fat":0,"saturatedFat":0,"transFat":0,"fiber":0,"sugar":0,"sodium":0,"cholesterol":0,"potassium":0}]}
Copy each id and name unchanged. Keep calories equal to the calories you were given, unless that number is 0.
Protein, carbs, fat, saturatedFat, transFat, fiber, and sugar are grams. Sodium, cholesterol, and potassium are milligrams.
Make the nutrients plausible for that food at that calorie amount. Use integers. Return one object for every food you were given.`;

type FoodRequest = {
  id: string;
  name: string;
  serving: string;
  calories: number;
};

function foodsFrom(value: unknown): FoodRequest[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { foods?: unknown }).foods)) return [];
  return (value as { foods: unknown[] }).foods
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim().slice(0, 80) : "";
      const name = typeof record.name === "string" ? record.name.trim().slice(0, 80) : "";
      if (!id || !name) return [];
      const calories = Number(record.calories);
      return [
        {
          id,
          name,
          serving: typeof record.serving === "string" ? record.serving.trim().slice(0, 80) : "",
          calories: Number.isFinite(calories) ? Math.max(0, Math.round(calories)) : 0,
        },
      ];
    })
    .slice(0, 20);
}

function modelJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1)) as unknown;
    throw new Error("The nutrient reading came back empty.");
  }
}

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return Response.json({ error: "Sign in again to update nutrients." }, { status: 401 });
    await verifyFirebaseIdToken(token);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Add OPENAI_API_KEY to .env.local and restart." }, { status: 500 });

    const foods = foodsFrom(await request.json().catch(() => null));
    if (!foods.length) return Response.json({ error: "No foods needed a nutrient update." }, { status: 400 });

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: JSON.stringify({ foods }) },
        ],
      }),
    });

    const payload = (await completion.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!completion.ok) {
      if (completion.status === 401) {
        return Response.json({ error: "OpenAI rejected the API key in .env.local." }, { status: 502 });
      }
      return Response.json({ error: "Nutrients could not be updated. Try again." }, { status: 502 });
    }
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "The nutrient reading came back empty." }, { status: 502 });
    return Response.json({ foods: nutrientsFromModel(modelJson(content), foods) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nutrients could not be updated.";
    const status = message === "Sign in again to update nutrients." ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
