// lib/ai.ts
// One function that sends a prompt to an AI model and gives back its text.
//
// It speaks the "OpenAI chat" format, which almost every provider supports. Pick one in .env.local:
//   OpenRouter (any model, paid or :free)  AI_BASE_URL=https://openrouter.ai/api/v1                         AI_MODEL=openai/gpt-5-mini
//   Google Gemini (free tier)              AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai  AI_MODEL=gemini-2.5-flash
//   Groq (free tier)                       AI_BASE_URL=https://api.groq.com/openai/v1                       AI_MODEL=llama-3.3-70b-versatile
// and put that provider's key in AI_API_KEY.
// AI_MODEL can list backups, comma separated: if one model fails or is too slow, the next one is tried.

const BASE_URL = process.env.AI_BASE_URL || "https://openrouter.ai/api/v1";
const MODELS = (process.env.AI_MODEL || "openai/gpt-5-mini").split(",").map((m) => m.trim()).filter(Boolean);

export async function askAI(system: string, user: string, options: { json?: boolean } = {}) {
  const key = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("AI_API_KEY is missing in .env.local");

  let lastError = new Error("No AI_MODEL set.");
  for (const model of MODELS) {
    try {
      return await askModel(model, key, system, user, options);
    } catch (e: any) {
      if (e.message.includes("rejected the API key")) throw e; // a bad key fails on every model
      lastError = e;
      console.warn(`[ai] ${model} failed, trying the next model: ${e.message}`);
    }
  }
  throw lastError;
}

async function askModel(model: string, key: string, system: string, user: string, options: { json?: boolean }) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://fura.dev", // OpenRouter shows this in its dashboard; others ignore it
      "X-Title": "Fura",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Ask the model to reply with pure JSON when we need structured data.
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    // Give up on a slow model after 90 seconds (the next one gets its turn).
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 401) throw new Error(`The AI provider rejected the API key (check AI_API_KEY). ${detail}`);
    throw new Error(`AI request failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text: string | undefined = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("The AI model returned an empty answer. Try again or switch AI_MODEL.");
  return text.trim();
}

// Models sometimes wrap JSON in ```json fences or add a sentence around it.
// This pulls out the {...} part and parses it.
export function readJSON(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI did not return JSON.");
  return JSON.parse(text.slice(start, end + 1));
}
