// POST /api/generate: writes a script, hooks, or video ideas in the creator's style.
// Body: { kind: "script" | "hooks" | "ideas", topic, length?, angle?, research? }

import { db, creditsLeft, spendCredits } from "@/lib/db";
import { handler, fail } from "@/lib/route";
import { askAI } from "@/lib/ai";
import { searchWeb, Source } from "@/lib/research";
import { scriptPrompt, hooksPrompt, ideasPrompt } from "@/lib/prompts";

export const maxDuration = 60;

// How many credits each kind of generation costs.
const COST = { script: 2, hooks: 1, ideas: 1 } as const;

export const POST = handler(async (creator, req) => {
  const body = await req.json();
  const kind = body.kind as keyof typeof COST;
  const topic = String(body.topic || "").trim().slice(0, 500);

  // ---- 1. Check the request ----
  if (!(kind in COST)) return fail("Unknown kind. Use script, hooks or ideas.");
  if (!topic) return fail("Write a topic first.");
  if (!creator.dna) return fail("Finish setting up your style first (upload a few clips).");
  if (creditsLeft(creator) < COST[kind]) return fail("You're out of credits for this month.", 402);

  // ---- 2. Optional web research (scripts only) ----
  let sources: Source[] = [];
  if (kind === "script" && body.research) sources = await searchWeb(topic);

  // ---- 3. Pick the right instructions and ask the AI ----
  const system =
    kind === "script"
      ? scriptPrompt(creator.dna, creator, body.length === "long" ? "long" : "short", sources)
      : kind === "hooks"
        ? hooksPrompt(creator.dna, creator, String(body.angle || "curiosity"))
        : ideasPrompt(creator.dna, creator);

  const output = await askAI(system, kind === "ideas" ? `Theme: ${topic}` : `Video topic: ${topic}`);

  // ---- 4. Save it to the Library and charge credits ----
  // Research links are added to the end of the script, so they're kept in the Library too.
  const content = sources.length
    ? `${output}\n\n---\n\n**Sources**\n\n${sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join("\n")}`
    : output;

  const saved = await db()
    .from("generations")
    .insert({ user_id: creator.id, type: kind, prompt_used: topic, content })
    .select("id")
    .single();
  if (saved.error) throw new Error(saved.error.message);

  await spendCredits(creator, COST[kind]);

  return Response.json({ creation: { id: saved.data.id, output: content }, creditsLeft: creditsLeft(creator) - COST[kind] });
});
