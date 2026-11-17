// POST /api/dna: the setup page calls this every few seconds while it shows a progress screen.
// Each call:
//   1. asks AssemblyAI how each clip's transcription is going and saves finished transcripts,
//   2. once every clip is finished, sends the transcripts to the AI to build the "Creator DNA",
//   3. returns the current progress so the page can show it.
// Doing it in small calls (instead of one long one) keeps us inside free hosting time limits.

import { db, saveVoice, claimVoiceBuild } from "@/lib/db";
import { handler } from "@/lib/route";
import { checkTranscription } from "@/lib/transcribe";
import { askAI, readJSON } from "@/lib/ai";
import { DNA_SYSTEM, dnaUserPrompt } from "@/lib/prompts";

export const maxDuration = 60; // the AI step can take ~20-40 seconds

export const POST = handler(async (creator, req) => {
  const { rebuild } = await req.json().catch(() => ({}));
  let status = rebuild ? "none" : creator.dna_status;

  // ---- 1. Update clips that are still being transcribed ----
  const { data } = await db()
    .from("videos")
    .select("id, filename, status, assembly_job_id")
    .eq("user_id", creator.id)
    .in("status", ["transcribing", "done", "failed"]) // skip half-finished uploads
    .order("created_at");
  const clips = data || [];

  for (const clip of clips.filter((c) => c.status === "transcribing" && c.assembly_job_id)) {
    const job = await checkTranscription(clip.assembly_job_id);
    if (job.status === "completed" && job.text.trim()) {
      await db().from("transcripts").insert({ video_id: clip.id, user_id: creator.id, raw_text: job.text.trim() });
      clip.status = "done";
    } else if (job.status === "completed" || job.status === "error") {
      clip.status = "failed"; // finished but no speech, or AssemblyAI couldn't read the file
    }
    if (clip.status !== "transcribing") await db().from("videos").update({ status: clip.status }).eq("id", clip.id);
  }

  const progress = clips.map((c) => ({ id: c.id, name: c.filename, status: c.status }));
  const stillWorking = clips.some((c) => c.status === "transcribing");
  const done = clips.filter((c) => c.status === "done");

  // ---- 2. Decide if it's time to build the DNA ----
  // "failed" waits for the person to press "Try again" (rebuild) so we don't retry a paid AI call forever.
  if (status === "ready" || status === "failed" || stillWorking || done.length === 0) {
    return Response.json({ clips: progress, dnaStatus: done.length === 0 && !stillWorking ? "no-clips" : status });
  }

  // "Claim" the build so two browser tabs polling at once don't both pay for the AI call.
  if (!(await claimVoiceBuild(creator))) return Response.json({ clips: progress, dnaStatus: "building" });

  // ---- 3. Build the DNA with the AI ----
  try {
    // Use the 10 newest clips so the prompt stays a sensible size.
    const newest = done.slice(-10);
    const { data: texts } = await db().from("transcripts").select("video_id, raw_text").in("video_id", newest.map((c) => c.id));
    const transcripts = newest
      .map((c) => ({ name: c.filename, text: texts?.find((t) => t.video_id === c.id)?.raw_text || "" }))
      .filter((t) => t.text);

    const answer = await askAI(DNA_SYSTEM, dnaUserPrompt(creator, transcripts), { json: true });
    await saveVoice(creator.id, "ready", readJSON(answer));
    status = "ready";
  } catch (err) {
    await saveVoice(creator.id, "failed", creator.dna);
    throw err;
  }

  return Response.json({ clips: progress, dnaStatus: status });
});
