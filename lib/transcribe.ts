// lib/transcribe.ts
// Turns a creator's audio/video clip into text using AssemblyAI.
// It is a two-step process: we "start" a job, then "check" it until it's finished.

const ASSEMBLY = "https://api.assemblyai.com/v2";

function headers() {
  const key = process.env.ASSEMBLY_AI_KEY;
  if (!key) throw new Error("ASSEMBLY_AI_KEY is missing in .env.local");
  return { authorization: key, "content-type": "application/json" };
}

// Step 1: give AssemblyAI a link to the file. It returns a job id right away.
export async function startTranscription(fileUrl: string) {
  const res = await fetch(`${ASSEMBLY}/transcript`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      audio_url: fileUrl,
      language_detection: true, // works for Hindi, English, Hinglish...
      auto_highlights: true,    // finds phrases the creator repeats a lot
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AssemblyAI: ${data.error || res.status}`);
  return data.id as string;
}

// Step 2: ask "is it done yet?". Returns the status, and the text once it's ready.
export async function checkTranscription(jobId: string) {
  const res = await fetch(`${ASSEMBLY}/transcript/${jobId}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(`AssemblyAI: ${data.error || res.status}`);

  return {
    status: data.status as "queued" | "processing" | "completed" | "error",
    text: (data.text as string) || "",
    error: data.error as string | undefined,
    // The top repeated phrases, e.g. ["let's go", "real talk"]
    highlights: ((data.auto_highlights_result?.results || []) as { text: string; count: number }[])
      .slice(0, 15)
      .map((h) => `${h.text} (x${h.count})`),
  };
}
