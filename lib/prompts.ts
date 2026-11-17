// lib/prompts.ts
// Every instruction we give the AI is in this one file.
// To make answers better, this is the file to edit.

import type { Source } from "./research";

// What we learn about a creator from their clips ("Creator DNA").
export type DNA = {
  summary: string;              // one-paragraph description of their style
  tone: string;                 // e.g. "high-energy, sarcastic, friendly"
  pacing: string;               // fast cuts? long stories?
  hookStyle: string;            // how they open videos
  structure: string;            // how a typical video flows
  audienceRelationship: string; // "bro", "you guys", teacher, friend...
  catchphrases: string[];       // things they say again and again
  favoriteWords: string[];
  topics: string[];
  dos: string[];                // rules for writing like them
  donts: string[];              // things they would never say
  sampleLines: string[];        // real lines copied from their transcripts
};

export type Profile = { niche: string | null; platforms: string[] | null; audience: string | null; goals: string | null };

// ---------- 1. Building the DNA from transcripts ----------

export const DNA_SYSTEM = `You are a sharp content strategist who studies how a creator talks.
You get transcripts of the creator's own videos. Study HOW they speak, not just what they say:
their words, rhythm, jokes, how they open, how they talk to viewers, what they repeat.

Reply with ONLY a JSON object with exactly these keys:
{
  "summary": "2-3 sentences describing their voice, so a ghostwriter could imitate it",
  "tone": "short description",
  "pacing": "short description",
  "hookStyle": "how they open videos, with a concrete example pattern",
  "structure": "how a typical video of theirs flows from start to end",
  "audienceRelationship": "how they address viewers (words they use for them, attitude)",
  "catchphrases": ["exact phrases they repeat"],
  "favoriteWords": ["words or slang they use a lot"],
  "topics": ["themes they cover"],
  "dos": ["specific rules a writer must follow to sound like them"],
  "donts": ["things that would sound fake for this creator"],
  "sampleLines": ["5-8 real sentences copied word-for-word from the transcripts that best show their voice"]
}
Be specific to THIS creator. Generic advice like "be engaging" is useless.
If they mix languages (for example Hindi and English), say so and keep it in the examples.
The creator reads this about themselves: write to them as "you" ("You open by..."), never "he" or "she".
Don't use em dashes (—); use commas, colons or full stops.`;

// Setup saves "who watches you" and "goals" as small JSON objects.
// These turn them back into a plain sentence for the AI. Old rows are plain text, so that passes through.
function parse(raw: string | null) {
  try { const v = JSON.parse(raw || ""); return typeof v === "object" ? v : null; } catch { return null; }
}

export function audienceText(raw: string | null) {
  const a = parse(raw);
  if (!a) return raw || "";
  const parts = [];
  if (a.ages?.length) parts.push(`Ages ${a.ages.join(", ")}`);
  if (a.mix) parts.push(`${a.mix.men}% men, ${a.mix.women}% women, ${100 - a.mix.men - a.mix.women}% non-binary / other genders`);
  if (a.notes) parts.push(`In their words: ${a.notes}`);
  return parts.join(". ");
}

export function goalsText(raw: string | null) {
  const g = parse(raw);
  if (!Array.isArray(g)) return raw || "";
  return g.map((x) => (x.note ? `${x.goal} (${x.note})` : x.goal)).join("; ");
}

export function dnaUserPrompt(profile: Profile, transcripts: { name: string; text: string }[]) {
  const about = `About the creator (they wrote this):
Niche: ${profile.niche || "not given"}
Platforms: ${(profile.platforms || []).join(", ") || "not given"}
Audience: ${audienceText(profile.audience) || "not given"}
Goals: ${goalsText(profile.goals) || "not given"}`;

  const clips = transcripts
    .map((t, i) => `--- Clip ${i + 1}: ${t.name} ---
Transcript:
${t.text.slice(0, 12000)}`) // cap each clip so the prompt stays a sane size
    .join("\n\n");

  return `${about}\n\n${clips}`;
}

// ---------- 2. The "voice card" every writing prompt starts with ----------

function voiceCard(dna: DNA, profile: Profile) {
  const list = (items: string[] | undefined) => (items || []).map((x) => `- ${x}`).join("\n");
  return `You are the ghostwriter for one specific creator. Everything you write must sound like THEM talking on camera, not like an AI.

## Who they are
Niche: ${profile.niche || "general"}
Platforms: ${(profile.platforms || []).join(", ") || "short-form video"}
Audience: ${audienceText(profile.audience) || "general"}
What their videos should do: ${goalsText(profile.goals) || "grow their audience"}

## Their voice
${dna.summary}
Tone: ${dna.tone}
Pacing: ${dna.pacing}
How they open videos: ${dna.hookStyle}
How their videos flow: ${dna.structure}
How they talk to viewers: ${dna.audienceRelationship}

Catchphrases (use naturally, never force all of them): ${(dna.catchphrases || []).join(" | ")}
Words they love: ${(dna.favoriteWords || []).join(", ")}

Do:
${list(dna.dos)}
Don't:
${list(dna.donts)}

## Real lines they said (match this rhythm and vocabulary)
${list(dna.sampleLines)}

## Hard rules
- Never use AI clichés: "In today's fast-paced world", "Let's dive in", "delve", "game-changer", "unlock", "Buckle up".
- Write words to be SPOKEN. Short sentences. Contractions. The way they actually talk.
- If they mix languages, you mix the same way.
- Don't use em dashes (—). Use commas, colons or full stops.
- When you describe the creator (not in the script itself), say "you", never "he" or "she".`;
}

// ---------- 3. The three things Fura can write ----------

export function scriptPrompt(dna: DNA, profile: Profile, length: "short" | "long", sources: Source[]) {
  const size =
    length === "short"
      ? "a SHORT-FORM script (Reels/Shorts/TikTok): 120-180 spoken words, about 45-60 seconds."
      : "a LONG-FORM YouTube script: 900-1300 spoken words, about 6-8 minutes, with clear sections.";

  const research = sources.length
    ? `\n\n## Research (use real facts from here, never invent numbers)\n` +
      sources.map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.text}`).join("\n\n")
    : "";

  return `${voiceCard(dna, profile)}${research}

## Your task
Write ${size}
Format in Markdown:
- Start with "## Hook": the first 1-3 lines, in their hook style. This decides if people keep watching.
- Then the body under short "##" section headings.
- End with "## Outro" with a call to action they would actually say.
- Put any on-screen text or B-roll ideas in *italics* on their own line, sparingly.
Return only the script.`;
}

export function hooksPrompt(dna: DNA, profile: Profile, angle: string) {
  return `${voiceCard(dna, profile)}

## Your task
Write 7 different opening hooks for the video topic the user gives.
Angle to lean into: ${angle}.
Each hook must take under 5 seconds to say, and must make someone stop scrolling.
Format: a numbered Markdown list. After each hook, add one short line in *italics* saying why it works.
Return only the list.`;
}

export function ideasPrompt(dna: DNA, profile: Profile) {
  return `${voiceCard(dna, profile)}

## Your task
Suggest 10 video ideas this creator could post next, around the theme the user gives.
They must fit the creator's niche and audience, and feel like something THEY would make.
Format as a numbered Markdown list. For each idea:
**Title in their voice**
One line: the angle and why their audience would click.
Return only the list.`;
}
