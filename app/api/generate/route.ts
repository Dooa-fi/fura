// POST /api/generate: writes a script, hooks, or video ideas in the creator's style.
// Body: { kind: "script" | "hooks" | "ideas", topic, length?, angle?, research?, hook? }
// The AI answers in JSON; lib/outputs.ts checks it (and asks again once if it is broken).

import { db, creditsLeft, chargeCredits, refundCredits } from "@/lib/db";
import { handler, fail } from "@/lib/route";
import { askChecked, checkScript, checkHooks, checkIdeas, toMarkdown, spokenLength, Refused, Script, Output } from "@/lib/outputs";
import { searchWeb, Source } from "@/lib/research";
import { scriptPrompt, hooksPrompt, ideasPrompt } from "@/lib/prompts";

export const maxDuration = 300; // room for backup AI models if the first one is slow

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

  // Take the credits now, so several requests at once can't go over the limit.
  const charge = await chargeCredits(creator, COST[kind]);
  if (!charge) return fail("You're out of credits for this month.", 402);

  try {
    // ---- 2. Optional web research (scripts only) ----
    let sources: Source[] = [];
    if (kind === "script" && body.research) sources = await searchWeb(topic);

    // ---- 3. Pick the right instructions and ask the AI ----
    const hook = String(body.hook || "").trim().slice(0, 200); // a hook the creator picked to start the script with
    const user = kind === "ideas" ? `Theme: ${topic}` : `Video topic: ${topic}`;
    const data: Output =
      kind === "script"
        ? await askChecked(scriptPrompt(creator.dna, creator, body.length === "long" ? "long" : "short", sources, hook), user, checkScript)
        : kind === "hooks"
          ? await askChecked(hooksPrompt(creator.dna, creator, String(body.angle || "curiosity").slice(0, 40)), user, checkHooks)
          : await askChecked(ideasPrompt(creator.dna, creator), user, checkIdeas);
    const output = toMarkdown(kind, data);

    // ---- 4. Save it to the Library ----
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

    return Response.json({
      creation: { id: saved.data.id, output: content },
      data, // the checked JSON, so the Studio can show cards and sections
      length: kind === "script" ? spokenLength(data as Script) : null,
      sources: sources.map((s) => ({ title: s.title, url: s.url })),
      creditsLeft: charge.left,
    });
  } catch (err) {
    await refundCredits(creator, COST[kind]); // nothing was written, so give the credits back
    if (err instanceof Refused) return fail(err.message, 422);
    throw err;
  }
});
