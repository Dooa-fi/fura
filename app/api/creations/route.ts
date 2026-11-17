// /api/creations: the Library.
//   GET    ?kind=script|hooks|ideas  → past generations
//   DELETE ?id=...                   → remove one
import { db } from "@/lib/db";
import { handler, fail } from "@/lib/route";

export const dynamic = "force-dynamic";

// Older versions of Fura saved hooks as "hook" and ideas as "topic", so each filter matches both names.
const TYPES: Record<string, string[]> = { script: ["script"], hooks: ["hooks", "hook"], ideas: ["ideas", "topic"] };

export const GET = handler(async (creator, req) => {
  const kind = new URL(req.url).searchParams.get("kind");
  let query = db()
    .from("generations")
    .select("id, type, prompt_used, content, created_at")
    .eq("user_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (kind && TYPES[kind]) query = query.in("type", TYPES[kind]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return Response.json({
    creations: (data || []).map((g) => ({ id: g.id, kind: g.type, input: g.prompt_used, output: g.content, created_at: g.created_at })),
  });
});

export const DELETE = handler(async (creator, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Missing id.");
  await db().from("generations").delete().eq("id", id).eq("user_id", creator.id);
  return Response.json({ ok: true });
});
