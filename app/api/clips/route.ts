// /api/clips
//   GET  → list the creator's uploaded clips
//   POST → get a one-time upload link so the browser can send the file straight to storage
//          (the file never passes through our server, so big files are fine and hosting stays free)
import { db } from "@/lib/db";
import { handler, fail } from "@/lib/route";

export const dynamic = "force-dynamic";

const MAX_MB = 50;      // Supabase free plan limit per file
const MAX_CLIPS = 30;   // per person, to stop abuse

export const GET = handler(async (creator) => {
  const { data } = await db()
    .from("videos")
    .select("id, filename, status, created_at")
    .eq("user_id", creator.id)
    .order("created_at");
  return Response.json({ clips: data || [] });
});

export const POST = handler(async (creator, req) => {
  const { fileName, fileType, fileSize } = await req.json();

  // Check the file BEFORE handing out an upload link. (The storage bucket enforces the same rules again.)
  if (!/^(audio|video)\//.test(String(fileType))) return fail("Only audio or video files can be used.");
  if (!(Number(fileSize) > 0)) return fail("This file is empty.");
  if (Number(fileSize) > MAX_MB * 1024 * 1024) return fail(`Each file must be under ${MAX_MB} MB.`);

  const existing = await db().from("videos").select("id", { count: "exact", head: true }).eq("user_id", creator.id);
  if ((existing.count || 0) >= MAX_CLIPS) return fail(`You can upload up to ${MAX_CLIPS} clips.`);

  // Where the file will live in storage: <user id>/<time>-<clean name>
  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${creator.id}/${Date.now()}-${safeName}`;

  const link = await db().storage.from("clips").createSignedUploadUrl(path);
  if (link.error) throw new Error(`Storage: ${link.error.message}`);

  const clip = await db()
    .from("videos")
    .insert({ user_id: creator.id, storage_url: path, filename: String(fileName).slice(0, 200), status: "uploading" })
    .select("id")
    .single();
  if (clip.error) throw new Error(clip.error.message);

  return Response.json({ clipId: clip.data.id, uploadUrl: link.data.signedUrl });
});
