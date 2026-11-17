// GET /api/me: everything the dashboard needs in one call.
import { db, creditsLeft, MONTHLY_CREDITS } from "@/lib/db";
import { handler } from "@/lib/route";

export const dynamic = "force-dynamic";

export const GET = handler(async (creator) => {
  const [recent, clips] = await Promise.all([
    db().from("generations").select("id, type, prompt_used, created_at")
      .eq("user_id", creator.id).order("created_at", { ascending: false }).limit(5),
    db().from("videos").select("id", { count: "exact", head: true }).eq("user_id", creator.id).eq("status", "done"),
  ]);

  return Response.json({
    profile: { niche: creator.niche, platforms: creator.platforms, audience: creator.audience, goals: creator.goals },
    dna: creator.dna,
    dnaStatus: creator.dna_status,
    credits: { left: creditsLeft(creator), total: MONTHLY_CREDITS },
    clipCount: clips.count || 0,
    canResearch: !!process.env.EXA_API_KEY, // web research only works when an Exa key is set
    recent: (recent.data || []).map((g) => ({ id: g.id, kind: g.type, input: g.prompt_used, created_at: g.created_at })),
  });
});
