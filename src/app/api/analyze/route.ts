import { analysisFromModel } from "@/lib/nutrition";
import { verifyFirebaseIdToken } from "@/lib/firebaseToken";

const MODEL = "gpt-4o-mini";
const MAX_BYTES = 4_000_000;

const PROMPT = `You estimate a plated meal from a photo. Reply with JSON only.
If the image is not food, return {"ok":false,"reason":"short reason"}.
Otherwise return:
{"ok":true,"name":"short meal name","serving":"estimated portion","note":"one sentence of uncertainty","items":[{"name":"","serving":"","calories":0,"protein":0,"carbs":0,"fat":0,"saturatedFat":0,"transFat":0,"fiber":0,"sugar":0,"sodium":0,"cholesterol":0,"potassium":0}]}
Use integers. Calories are kcal. Sodium, cholesterol, and potassium are milligrams. Every other nutrient is grams.
Split the plate into the foods you can see. Estimate a realistic eaten portion, not a restaurant database serving unless the portion is obvious.
Do not invent a brand if the package is unreadable.`;

function imageType(bytes: Uint8Array) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function jsonFromModel(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced?.[1] ?? trimmed) as unknown;
}

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return Response.json({ error: "Sign in again to scan a meal." }, { status: 401 });
    await verifyFirebaseIdToken(token);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Add OPENAI_API_KEY to .env.local and restart." }, { status: 500 });

    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) return Response.json({ error: "Choose a photo of the meal." }, { status: 400 });
    if (image.size <= 0 || image.size > MAX_BYTES) {
      return Response.json({ error: "That photo is too large. Try another shot." }, { status: 400 });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const mime = imageType(bytes);
    if (!mime) return Response.json({ error: "Use a JPEG, PNG, or WebP photo." }, { status: 400 });

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
          {
            role: "user",
            content: [
              { type: "text", text: "Estimate this meal." },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`, detail: "high" },
              },
            ],
          },
        ],
      }),
    });

    const payload = (await completion.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!completion.ok) {
      const message = payload.error?.message ?? "";
      if (completion.status === 401) {
        return Response.json({ error: "OpenAI rejected the API key in .env.local." }, { status: 502 });
      }
      return Response.json(
        { error: message ? `The photo could not be read. ${message}` : "The photo could not be read. Try again." },
        { status: 502 },
      );
    }
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "The photo reading came back empty." }, { status: 502 });
    const analysis = analysisFromModel(jsonFromModel(content));
    return Response.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The photo could not be read.";
    const status = message === "Sign in again to scan a meal." ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
