// POST /api/clips/transcribe: called right after the browser finishes uploading a clip.
// We create a private download link for AssemblyAI and start the transcription job.
import { db, saveVoice } from "@/lib/db";
import { handler, fail } from "@/lib/route";
import { startTranscription } from "@/lib/transcribe";

export const POST = handler(async (creator, req) => {
  const { clipId } = await req.json();

  const { data: clip } = await db().from("videos").select("*").eq("id", clipId).eq("user_id", creator.id).maybeSingle();
  if (!clip) return fail("Clip not found.", 404);

  // A link AssemblyAI can download from for the next 24 hours.
  const link = await db().storage.from("clips").createSignedUrl(clip.storage_url, 60 * 60 * 24);
  if (link.error) throw new Error(`Storage: ${link.error.message}`);

  const jobId = await startTranscription(link.data.signedUrl);
  await db().from("videos").update({ assembly_job_id: jobId, status: "transcribing" }).eq("id", clip.id);

  // New material → rebuild the DNA. The old DNA stays usable until the new one is ready.
  if (creator.dna_status !== "none") await saveVoice(creator.id, "none", creator.dna);

  return Response.json({ ok: true });
});
