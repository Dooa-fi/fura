// lib/db.ts
// Everything that talks to the database (Supabase) lives here.
// Only server code imports this file: the service key must never reach the browser.
//
// The tables (see supabase/schema.sql):
//   users           one row per person (linked to Clerk by clerk_id)
//   niche_profiles  "about you" answers from setup
//   style_profiles  the Creator DNA the AI builds
//   usage           credits used per month
//   videos          uploaded clips      → transcripts  the text of each clip
//   generations     every script / hooks / ideas Fura wrote (the Library)

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";
import type { DNA } from "./prompts";

let client: SupabaseClient | null = null;

// Make the Supabase client the first time we need it, then reuse it.
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in .env.local");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Each person gets this many credits per month.
export const MONTHLY_CREDITS = 100;
const thisMonth = () => new Date().toISOString().slice(0, 7); // e.g. "2026-11"

// Everything we know about the signed-in person, gathered from 4 tables into one simple object.
export type Creator = {
  id: string;
  niche: string | null;
  platforms: string[];
  audience: string | null;
  goals: string | null;
  dna: DNA | null;
  dna_status: "none" | "building" | "ready" | "failed";
  credits_used: number;
};

export async function getCreator(clerkId: string): Promise<Creator> {
  // 1. Load their user row together with profile, style and this month's usage, in ONE request.
  //    (Every trip to the database costs time, so we ask for all of it at once.)
  const columns = "id, niche_profiles(*), style_profiles(profile_json), usage(count, month)";
  let { data: user, error } = await db().from("users").select(columns)
    .eq("clerk_id", clerkId).eq("usage.month", thisMonth()).maybeSingle();
  if (error) throw new Error(error.message);

  // 2. First visit: create their row, using their real email from Clerk.
  if (!user) {
    const person = await (await clerkClient()).users.getUser(clerkId);
    const made = await db()
      .from("users")
      .insert({
        clerk_id: clerkId,
        email: person.primaryEmailAddress?.emailAddress || `${clerkId}@no-email`,
        name: person.fullName,
      })
      .select(columns)
      .single();
    if (made.error) throw new Error(made.error.message);
    user = made.data;
  }

  // One-to-one tables come back as an object, the usage table as a list (filtered to this month).
  const one = (x: any) => (Array.isArray(x) ? x[0] : x) ?? null;
  const niche = { data: one(user.niche_profiles) };
  const style = { data: one(user.style_profiles) };
  const usage = { data: one(user.usage) };

  // style_profiles.profile_json looks like { status: "ready", dna: {...} }
  const voice = style.data?.profile_json || {};

  return {
    id: user.id,
    niche: niche.data?.niche ?? null,
    platforms: niche.data?.platforms ?? [],
    audience: niche.data?.audience_gender_ratio ?? null,
    goals: niche.data?.engagement_metrics ?? null,
    dna: voice.dna ?? null,
    dna_status: voice.status ?? "none",
    credits_used: usage.data?.count ?? 0,
  };
}

// ---------- Creator DNA ----------

// Save the voice status, and the DNA itself when we have one.
export async function saveVoice(creatorId: string, status: Creator["dna_status"], dna: DNA | null) {
  const { error } = await db()
    .from("style_profiles")
    .upsert(
      { user_id: creatorId, profile_json: { status, dna }, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw new Error(error.message);
  if (status === "ready") await db().from("users").update({ onboarding_complete: true }).eq("id", creatorId);
}

// Mark the voice as "building", but only if nobody else is already building it.
// Returns false if another request got there first (e.g. two browser tabs polling at once).
export async function claimVoiceBuild(creator: Creator) {
  const exists = await db().from("style_profiles").select("id").eq("user_id", creator.id).maybeSingle();
  if (!exists.data) {
    const made = await db().from("style_profiles").insert({ user_id: creator.id, profile_json: { status: "building", dna: null } });
    return !made.error; // an error here means another request inserted first
  }
  const claimed = await db()
    .from("style_profiles")
    .update({ profile_json: { status: "building", dna: creator.dna }, updated_at: new Date().toISOString() })
    .eq("user_id", creator.id)
    .or("profile_json->>status.is.null,profile_json->>status.neq.building")
    .select("id");
  return (claimed.data?.length || 0) > 0;
}

// ---------- Credits ----------

export function creditsLeft(creator: Creator) {
  return MONTHLY_CREDITS - creator.credits_used;
}

// Take credits away after a successful generation. A new month gets a new row, so credits reset by themselves.
// shortcut: read-then-write, two generations at the exact same moment could both pass; fine for one user, use a SQL function if this goes big.
export async function spendCredits(creator: Creator, cost: number) {
  const row = await db().from("usage").select("id").eq("user_id", creator.id).eq("month", thisMonth()).maybeSingle();
  if (row.data) {
    await db().from("usage").update({ count: creator.credits_used + cost }).eq("id", row.data.id);
  } else {
    await db().from("usage").insert({ user_id: creator.id, month: thisMonth(), count: cost });
  }
}
