// lib/outputs.ts
// The AI answers in JSON. Models sometimes break the format, so every answer goes through a "checker" here:
//   1. read the JSON,
//   2. make sure it has the right shape (enough hooks, a Hook and an Outro in a script...),
//   3. clean the text (no em dashes, no stray quotes, no "As an AI").
// If a check fails it throws a short reason, and lib/generate.ts asks the AI once more with that reason.
// toMarkdown() turns a checked answer into the Markdown that is saved in the Library.

import { askAI, readJSON } from "./ai";
import type { DNA } from "./prompts";

export type Script = { title: string; sections: { heading: string; lines: string; onScreen: string }[] };
export type Hooks = { hooks: { line: string; why: string }[] };
export type Ideas = { ideas: { title: string; angle: string }[] };
export type Output = Script | Hooks | Ideas;

// Thrown when the AI won't write about a topic (unsafe or not a video topic). Shown to the person as-is.
export class Refused extends Error {}

// Ask the AI for JSON and check it. If the check fails, ask once more and tell the model exactly what was wrong.
export async function askChecked<T>(system: string, user: string, check: (raw: string) => T): Promise<T> {
  const first = await askAI(system, user, { json: true });
  try {
    return check(first);
  } catch (err: any) {
    if (err instanceof Refused) throw err;
    console.warn("[ai] unusable answer, asking again:", err.message);
    const retry = `${user}\n\nYour last reply could not be used because ${err.message}. Reply again with ONLY the JSON object, in exactly the shape asked for.`;
    try {
      return check(await askAI(system, retry, { json: true }));
    } catch (again: any) {
      if (again instanceof Refused) throw again;
      throw new Error("The AI's answer didn't come out right, even after a second try. Please try again.");
    }
  }
}

// Clean one piece of text from the AI.
export function clean(value: unknown, max = 2000) {
  return String(value ?? "")
    .replace(/\s*—\s*|\s+–\s+/g, ", ")    // em dashes (and spaced en dashes) become commas; "6–8" stays
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "") // quotes wrapped around the whole line
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

const ROBOT = /\b(as an ai|language model|i can't help with|i cannot help with)\b/i;

function start(raw: string) {
  const data = readJSON(raw);
  if (typeof data.refused === "string" && data.refused.trim()) throw new Refused(clean(data.refused, 300));
  if (ROBOT.test(raw)) throw new Error("it talked about being an AI instead of writing in the creator's voice");
  return data;
}

export function checkScript(raw: string): Script {
  const data = start(raw);
  const sections = (Array.isArray(data.sections) ? data.sections : [])
    .map((s: any) => ({ heading: clean(s?.heading, 60), lines: clean(s?.lines, 4000), onScreen: clean(s?.onScreen, 200).replace(/^(on[- ]?screen( text)?|text)\s*:\s*/i, "") }))
    .filter((s: Script["sections"][number]) => s.heading && s.lines);
  if (sections.length < 3) throw new Error(`a script needs at least 3 sections with text, got ${sections.length}`);
  if (!/hook/i.test(sections[0].heading)) throw new Error('the first section must be called "Hook"');
  if (!/outro/i.test(sections[sections.length - 1].heading)) throw new Error('the last section must be called "Outro"');
  return { title: clean(data.title, 120) || "Script", sections };
}

export function checkHooks(raw: string): Hooks {
  const data = start(raw);
  const hooks = (Array.isArray(data.hooks) ? data.hooks : [])
    .map((h: any) => ({ line: clean(h?.line, 200), why: clean(h?.why, 200) }))
    .filter((h: Hooks["hooks"][number]) => h.line);
  const unique = hooks.filter((h: Hooks["hooks"][number], i: number) => hooks.findIndex((x: Hooks["hooks"][number]) => x.line.toLowerCase() === h.line.toLowerCase()) === i);
  if (unique.length < 5) throw new Error(`expected 7 different hooks, got ${unique.length}`);
  return { hooks: unique.slice(0, 7) };
}

export function checkIdeas(raw: string): Ideas {
  const data = start(raw);
  const ideas = (Array.isArray(data.ideas) ? data.ideas : [])
    .map((x: any) => ({ title: clean(x?.title, 120), angle: clean(x?.angle, 300) }))
    .filter((x: Ideas["ideas"][number]) => x.title);
  if (ideas.length < 6) throw new Error(`expected 10 ideas, got ${ideas.length}`);
  return { ideas: ideas.slice(0, 10) };
}

// The Creator DNA: every field gets a safe value, and the two the writers rely on most must be there.
export function checkDNA(raw: string): DNA {
  const data = readJSON(raw);
  const text = (v: unknown) => clean(v, 1500);
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clean(x, 300)).filter(Boolean).slice(0, n) : []);
  const dna: DNA = {
    summary: text(data.summary), tone: text(data.tone), pacing: text(data.pacing), hookStyle: text(data.hookStyle),
    structure: text(data.structure), audienceRelationship: text(data.audienceRelationship),
    catchphrases: list(data.catchphrases, 12), favoriteWords: list(data.favoriteWords, 20), topics: list(data.topics, 12),
    dos: list(data.dos, 12), donts: list(data.donts, 12), sampleLines: list(data.sampleLines, 8),
  };
  if (!dna.summary) throw new Error("the summary is missing");
  if (dna.sampleLines.length < 2) throw new Error("sampleLines needs at least 2 real lines from the transcripts");
  return dna;
}

// How long a script takes to say, at a normal talking speed (about 150 words a minute).
export function spokenLength(script: Script) {
  const words = script.sections.reduce((n, s) => n + s.lines.split(/\s+/).filter(Boolean).length, 0);
  return { words, seconds: Math.round(words / 2.5) };
}

export function toMarkdown(kind: string, out: Output) {
  if (kind === "script") {
    const s = out as Script;
    return s.sections.map((x) => `## ${x.heading}\n\n${x.lines}${x.onScreen ? `\n\n*On screen: ${x.onScreen}*` : ""}`).join("\n\n");
  }
  if (kind === "hooks") return (out as Hooks).hooks.map((h, i) => `${i + 1}. **${h.line}**${h.why ? `\n   *${h.why}*` : ""}`).join("\n\n");
  return (out as Ideas).ideas.map((x, i) => `${i + 1}. **${x.title}**${x.angle ? `\n   ${x.angle}` : ""}`).join("\n\n");
}

// Self-check: `npx tsx lib/outputs.ts`
if (process.argv[1]?.endsWith("outputs.ts")) {
  const assert = (ok: boolean, msg: string) => { if (!ok) throw new Error("FAIL: " + msg); console.log("ok:", msg); };
  const fails = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  const sec = (h: string) => ({ heading: h, lines: "Some words here.", onScreen: "" });

  const s = checkScript("Sure! ```json\n" + JSON.stringify({ title: "Week 3", sections: [sec("Hook"), sec("Why"), sec("Outro")] }) + "\n```");
  assert(s.sections.length === 3, "script inside fences and chatter is read");
  assert(fails(() => checkScript(JSON.stringify({ sections: [sec("Intro"), sec("Why"), sec("Outro")] }))), "script must start with Hook");
  assert(fails(() => checkScript(JSON.stringify({ sections: [sec("Hook"), sec("Outro")] }))), "script needs 3 sections");
  assert(clean("“Week 3 — the wall”") === "Week 3, the wall", "quotes and em dashes are cleaned");
  assert(clean("₹1,500–2,000 a month") === "₹1,500–2,000 a month", "number ranges keep their dash");
  const seven = Array.from({ length: 7 }, (_, i) => ({ line: `Hook ${i}`, why: "because" }));
  assert(checkHooks(JSON.stringify({ hooks: [...seven, ...seven] })).hooks.length === 7, "duplicate hooks removed, capped at 7");
  assert(fails(() => checkHooks(JSON.stringify({ hooks: seven.slice(0, 3) }))), "too few hooks fails");
  assert(fails(() => checkHooks("I'm sorry, as an AI language model I can't do that.")), "non-JSON refusal fails");
  let refused = false; try { checkIdeas(JSON.stringify({ refused: "That topic isn't safe to make a video about." })); } catch (e) { refused = e instanceof Refused; }
  assert(refused, "a refusal comes back as Refused");
  assert(toMarkdown("hooks", { hooks: seven.slice(0, 2) }).startsWith("1. **Hook 0**"), "hooks become a numbered list");
  assert(spokenLength(s).words === 9, "word count");
  const os = checkScript(JSON.stringify({ sections: [sec("Hook"), { ...sec("Why"), onScreen: "On-screen: 80 g protein" }, sec("Outro")] }));
  assert(os.sections[1].onScreen === "80 g protein", "repeated 'On-screen:' label is removed");
}
