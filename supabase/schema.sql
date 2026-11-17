-- supabase/schema.sql
-- The database Fura uses. Your Supabase project already has these tables.
-- For a brand-new project: paste this whole file into Supabase → SQL Editor → Run. Safe to run more than once.

-- 1. One row per person who signs up (linked to their Clerk login).
create table if not exists users (
  id                  uuid primary key default gen_random_uuid(),
  clerk_id            text unique not null,
  email               text not null,
  name                text,
  onboarding_complete boolean default false,
  tier                text default 'free',
  created_at          timestamptz default now()
);

-- 2. "About you" answers from setup step 1.
create table if not exists niche_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique not null references users(id) on delete cascade,
  niche                 text,
  platforms             jsonb default '[]',
  followers             jsonb default '{}',
  audience_gender_ratio text,   -- "Who watches you?"
  engagement_metrics    text,   -- "What do you want your videos to do?"
  created_at            timestamptz default now()
);

-- 3. The Creator DNA. profile_json = { "status": "none|building|ready|failed", "dna": { ... } }
create table if not exists style_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique not null references users(id) on delete cascade,
  profile_json jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 4. Credits used per month. A new month = a new row, so credits reset by themselves.
create table if not exists usage (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  month   text not null,          -- e.g. '2026-11'
  count   int  not null default 0,
  unique (user_id, month)         -- one row per person per month
);

-- 5. Every uploaded clip. status: uploading → transcribing → done | failed
create table if not exists videos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  storage_url     text not null,  -- where the file sits in the "clips" storage bucket
  filename        text,
  status          text default 'uploading',
  assembly_job_id text,           -- AssemblyAI transcription job
  created_at      timestamptz default now()
);

-- 6. The text of each clip.
create table if not exists transcripts (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid references videos(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  raw_text   text,
  created_at timestamptz default now()
);

-- 7. Everything Fura wrote (the Library). type: script | hooks | ideas
create table if not exists generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null,
  prompt_used text,               -- the topic the person typed
  content     text,               -- what the AI wrote (Markdown)
  created_at  timestamptz default now()
);

-- Lock every table. Only our server (using the secret service key) can read/write them.
alter table users          enable row level security;
alter table niche_profiles enable row level security;
alter table style_profiles enable row level security;
alter table usage          enable row level security;
alter table videos         enable row level security;
alter table transcripts    enable row level security;
alter table generations    enable row level security;

-- A private storage bucket for uploads: audio/video only, 50 MB max per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['audio/*', 'video/*'])
on conflict (id) do nothing;
