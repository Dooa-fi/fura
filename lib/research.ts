// lib/research.ts
// Optional: searches the web with Exa so scripts can include real, current facts.
// If EXA_API_KEY is not set, research is simply skipped.

export type Source = { title: string; url: string; text: string };

export async function searchWeb(query: string): Promise<Source[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      query,
      numResults: 5,
      contents: { text: { maxCharacters: 1500 } }, // a short chunk of each page
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    console.error("Exa search failed:", res.status, await res.text());
    return []; // research is a bonus, so a failure should not stop the script
  }

  const data = await res.json();
  return (data.results || []).map((r: any) => ({ title: r.title || r.url, url: r.url, text: r.text || "" }));
}
