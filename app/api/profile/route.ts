// POST /api/profile: save "about you" from setup step 1.
import { db } from "@/lib/db";
import { handler, fail } from "@/lib/route";

// Text from a browser can't be trusted: force the right type and cap the length.
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []);
const pct = (v: unknown) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)));

export const POST = handler(async (creator, req) => {
  const body = await req.json();
  const niche = text(body.niche, 200);
  if (!niche) return fail("Tell us your niche first.");

  // "Who watches you?": age groups, gender mix, and a free description. All optional.
  const a = body.audience || {};
  const men = pct(a.mix?.men);
  const audience = {
    ages: list(a.ages, 6).map((x) => text(x, 20)),
    mix: a.mix ? { men, women: Math.min(pct(a.mix.women), 100 - men) } : null,
    notes: text(a.notes, 300),
  };

  // "What do you want your videos to do?": picked goals, each with optional extra context.
  const goals = list(body.goals, 10).map((g: any) => ({ goal: text(g?.goal, 60), note: text(g?.note, 300) })).filter((g) => g.goal);

  // Both columns are plain text, so the answers are stored as JSON strings.
  const { error } = await db().from("niche_profiles").upsert(
    {
      user_id: creator.id,
      niche,
      platforms: list(body.platforms, 10).map((p) => text(p, 40)),
      audience_gender_ratio: JSON.stringify(audience),
      engagement_metrics: JSON.stringify(goals),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);

  return Response.json({ ok: true });
});
