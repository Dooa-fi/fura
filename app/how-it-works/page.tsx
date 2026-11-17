// app/how-it-works/page.tsx: an interactive tour of Fura's code, for presenting the project.
// This runs on the server at build time: it opens our real source files, cuts out the
// relevant piece for each step, and colours it. So the code shown here is always the real code.

import fs from "fs";
import path from "path";
import Link from "next/link";
import { codeToHtml } from "shiki";
import { Logo } from "@/components/logo";
import { CodeTour, TourStep } from "./tour";
import { FileGraph, GraphFile } from "./file-graph";

export const dynamic = "force-static";
export const metadata = { title: "How Fura works" };

// Cut a piece out of a file.
//   from: text on the first line we want.
//   to:   text on the line AFTER the last line we want. If left out, we stop at the end of
//         the block that starts at `from` (a line that is just "}", "});" or "`;").
//   If both are left out, we show the whole file.
function cut(file: string, from?: string, to?: string) {
  const lines = fs.readFileSync(path.join(process.cwd(), file), "utf8").split("\n");
  if (!from) return lines.join("\n").trim();

  const start = lines.findIndex((l) => l.includes(from));
  if (start === -1) return `// (could not find "${from}" in ${file})`;

  let end = to
    ? lines.findIndex((l, i) => i > start && l.includes(to)) - 1
    : lines.findIndex((l, i) => i > start && /^(\}|\}\);|`;)\s*$/.test(l));
  if (to === "END") end = lines.length - 1;
  if (end < start) end = lines.length - 1;
  return lines.slice(start, end + 1).join("\n").trim();
}

// ---------- Data for the file map ----------
// Read every code file, note what it imports and which outside service it calls.
const SERVICE_SIGNS: [string, RegExp][] = [
  ["Clerk", /from "@clerk\//],
  ["Supabase", /from "@supabase\//],
  ["AssemblyAI", /assemblyai\.com/],
  ["AI model", /chat\/completions/],
  ["Exa", /api\.exa\.ai/],
];

function codeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return codeFiles(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

function fileMap(): GraphFile[] {
  const root = process.cwd();
  const all = [...codeFiles(path.join(root, "app")), ...codeFiles(path.join(root, "components")), ...codeFiles(path.join(root, "lib")), path.join(root, "middleware.ts")]
    .map((f) => path.relative(root, f));

  // "@/lib/db" or "./tour" → "lib/db.ts" / "app/how-it-works/tour.tsx"
  const resolve = (from: string, spec: string) => {
    const base = spec.startsWith("@/") ? spec.slice(2) : spec.startsWith(".") ? path.join(path.dirname(from), spec) : null;
    return base ? [base + ".ts", base + ".tsx", base].find((c) => all.includes(c)) : undefined;
  };

  return all.map((file) => {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    const specs = Array.from(code.matchAll(/(?:from|import)\s+["']([^"']+)["']/g), (m) => m[1]);
    const imports = Array.from(new Set(specs.map((spec) => resolve(file, spec)).filter(Boolean))) as string[];
    // The first comment line describes the file. Drop the "path:" part at its start.
    const first = code.split("\n").find((l) => l.startsWith("//")) || "";
    const desc = first.replace(/^\/\/\s*/, "").replace(file + ": ", "").replace(/^\w/, (c) => c.toUpperCase());
    return { path: file, desc, imports, services: SERVICE_SIGNS.filter(([, sign]) => sign.test(code)).map(([name]) => name) };
  });
}

// The story of Fura, in the order things happen to a user.
const STEPS: Omit<TourStep, "html">[] = [
  {
    title: "Someone signs up",
    where: "Browser → Clerk",
    explain:
      "We don't build login ourselves. Clerk shows the sign-up form, checks emails and passwords, and gives the browser a secure cookie. This small file runs before every page and sends anyone who isn't signed in to the sign-in page if they try to open the dashboard.",
    file: "middleware.ts",
  },
  {
    title: "Every request checks who you are",
    where: "Our server",
    explain:
      "All our API routes are wrapped in this one function. It asks Clerk who the person is, finds (or creates) their row in the database, and catches any error so the page always gets a clear message back instead of a crash.",
    file: "lib/route.ts",
    from: "export function handler",
  },
  {
    title: "Finding or creating your database row",
    where: "Our server → Supabase",
    explain:
      "The first time you do anything, you get a row in the users table (with your real email from Clerk). Then we load your profile, style and this month's credits at the same time and merge them into one simple object the rest of the code uses. Supabase is a hosted Postgres database.",
    file: "lib/db.ts",
    from: "export async function getCreator",
  },
  {
    title: "You tell Fura about yourself",
    where: "Browser → /api/profile",
    explain:
      "Step 1 of setup. The creator picks goals (each with optional context), age groups, a gender mix and a short description of their viewers. We force every value into the right type and cap its length before saving, because anything that comes from a browser can't be trusted blindly. Later, lib/prompts.ts turns these answers back into plain sentences for the AI.",
    file: "app/api/profile/route.ts",
    from: "// Text from a browser",
  },
  {
    title: "You upload clips (part 1: get a link)",
    where: "Browser → /api/clips",
    explain:
      "We check the file is audio or video and under 50 MB, then ask Supabase Storage for a one-time upload link. The file itself never passes through our server. That's what lets Fura run on free hosting.",
    file: "app/api/clips/route.ts",
    from: "export const POST",
  },
  {
    title: "You upload clips (part 2: send the file)",
    where: "Browser → Supabase Storage",
    explain:
      "The browser sends the file straight to storage using that link. We use XMLHttpRequest instead of fetch only because it can report upload progress, which drives the progress bars.",
    file: "app/onboarding/page.tsx",
    from: "function putFile",
  },
  {
    title: "Turning speech into text",
    where: "Our server → AssemblyAI",
    explain:
      "We give AssemblyAI a private link to the clip. It starts a transcription job and gives back a job id. Later we ask 'is it done?' with that id. We also turn on auto-highlights, which finds phrases the creator repeats: their catchphrases.",
    file: "lib/transcribe.ts",
    from: "export async function startTranscription",
    to: "export async function checkTranscription",
  },
  {
    title: "Waiting for transcripts",
    where: "Browser polls /api/dna",
    explain:
      "While you watch the progress screen, the page calls this route every 4 seconds. Each call checks unfinished clips and saves any transcripts that are ready. Many short calls instead of one long one keeps us under free hosting time limits.",
    file: "app/api/dna/route.ts",
    from: "// ---- 1.",
    to: "// ---- 2.",
  },
  {
    title: "What we ask the AI to learn",
    where: "lib/prompts.ts",
    explain:
      "This is the instruction for building the Creator DNA. We ask for how the person talks: tone, pacing, how they open videos, catchphrases, and real lines copied from their transcripts. The output must be JSON so we can store and show it.",
    file: "lib/prompts.ts",
    from: "export const DNA_SYSTEM",
  },
  {
    title: "Building the Creator DNA",
    where: "Our server → AI model",
    explain:
      "When every clip is transcribed, we send all transcripts to the AI once. First we 'claim' the job in the database so two open tabs can't both pay for it. The result is saved and shown on your dashboard.",
    file: "app/api/dna/route.ts",
    from: "// ---- 2.",
  },
  {
    title: "Talking to the AI",
    where: "Our server → AI provider",
    explain:
      "One function sends a prompt and returns the reply. It uses the standard 'OpenAI chat' format, so the same code works with OpenRouter, Google Gemini, Groq and others. Switching AI is three settings in .env.local, not a code change.",
    file: "lib/ai.ts",
    from: "export async function askAI",
  },
  {
    title: "You ask for a script",
    where: "Browser → /api/generate",
    explain:
      "The main feature. Check the request, optionally research the web, pick the right prompt, ask the AI, save the result to your Library, and take credits. Each step is a numbered comment in the code.",
    file: "app/api/generate/route.ts",
    from: "export const POST",
  },
  {
    title: "Why the script sounds like you",
    where: "lib/prompts.ts",
    explain:
      "Every writing prompt starts with this 'voice card' built from your DNA. The real lines you said are the strongest part: the AI copies their rhythm and vocabulary. We also ban common AI phrases.",
    file: "lib/prompts.ts",
    from: "function voiceCard",
  },
  {
    title: "Researching real facts",
    where: "Our server → Exa",
    explain:
      "If you tick 'Research the web first', we search the web with Exa and paste the top results into the prompt, so scripts use real facts and you get source links. If it fails, the script is still written.",
    file: "lib/research.ts",
    from: "export async function searchWeb",
  },
  {
    title: "Credits",
    where: "lib/db.ts",
    explain:
      "Everyone gets 100 credits a month (script 2, hooks 1, ideas 1). Usage is stored as one row per person per month, so a new month automatically starts from zero without any scheduled job.",
    file: "lib/db.ts",
    from: "// ---------- Credits",
    to: "END",
  },
  {
    title: "The database",
    where: "Supabase (Postgres)",
    explain:
      "Seven small tables: users, niche_profiles (about you), style_profiles (the Creator DNA), usage (credits), videos and transcripts (uploads and their text), and generations (everything Fura wrote). Plus one private storage bucket for the files. Every table is locked so only our server can touch it.",
    file: "supabase/schema.sql",
  },
];

export default async function HowItWorks() {
  const steps: TourStep[] = await Promise.all(
    STEPS.map(async (s) => ({
      ...s,
      html: await codeToHtml(cut(s.file, s.from, s.to), {
        lang: s.file.endsWith(".sql") ? "sql" : "tsx",
        themes: { light: "github-light", dark: "github-dark" },
      }),
    }))
  );

  return (
    <div>
      <header className="mx-auto max-w-6xl px-4 sm:px-6 h-20 flex items-center justify-between">
        <Logo />
        <Link href="/dashboard" className="btn-ghost h-10 px-4 text-sm">Open Fura</Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-14">
        <h1 className="text-[40px] sm:text-6xl font-extrabold tracking-[-0.035em] max-w-[18ch] leading-[1.02]">How Fura works</h1>
        <p className="mt-6 text-lg sm:text-xl text-muted max-w-[60ch] leading-relaxed">
          Fura learns how a creator talks from their own videos, then writes new scripts in that style. Below is the whole system,
          followed by a step-by-step tour of the real code. Click any step to see exactly what runs.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <h2 className="text-2xl font-bold">The big picture</h2>
        <SystemMap />
        <div className="mt-8 grid md:grid-cols-3 gap-6 text-muted leading-relaxed">
          <p><strong className="text-ink">One app.</strong> The pages and the server code are both in one Next.js project, so it runs on Vercel&apos;s free plan with no separate backend.</p>
          <p><strong className="text-ink">Creator DNA.</strong> A short profile of how someone talks: tone, pacing, how they open videos, catchphrases, and real example lines.</p>
          <p><strong className="text-ink">Rented brains.</strong> Login, transcription, AI writing and web search are done by specialist services. Our code connects them.</p>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold">Follow one user through the code</h2>
          <p className="mt-2 text-muted">From sign-up to a finished script, in the order it happens.</p>
          <CodeTour steps={steps} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16">
        <h2 className="text-2xl font-bold">How the files connect</h2>
        <p className="mt-2 mb-6 text-muted max-w-[65ch]">Every line is a real import, read from the code when this page was built. Open a folder to see its files, and click a file to follow its links.</p>
        <FileGraph files={fileMap()} />
      </section>

      <FileMap />
    </div>
  );
}

// A simple diagram of who talks to whom.
function SystemMap() {
  const services = [
    ["Clerk", "Sign up & login"],
    ["Supabase", "Database + file storage"],
    ["AssemblyAI", "Speech → text"],
    ["AI model", "Writing (OpenRouter, Gemini, Groq…)"],
    ["Exa", "Web research"],
  ];
  return (
    <div className="mt-6 panel p-6 sm:p-8 grid lg:grid-cols-[1fr_auto_1fr_auto_1.3fr] gap-4 items-center">
      <Box title="Browser" text="The pages you click: setup, Studio, Library" />
      <Arrow />
      <Box title="Next.js API routes" text="Our server code in app/api/. Checks login, saves data, calls services." strong />
      <Arrow />
      <ul className="grid gap-2">
        {services.map(([name, job]) => (
          <li key={name} className="rounded-xl border border-line px-4 py-2.5 flex justify-between gap-4 text-sm">
            <span className="font-semibold">{name}</span><span className="text-muted text-right">{job}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Box({ title, text, strong }: { title: string; text: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-5 py-4 ${strong ? "bg-accent text-accent-fg" : "border border-line"}`}>
      <p className="font-bold">{title}</p>
      <p className={`mt-1 text-sm ${strong ? "text-accent-fg/75" : "text-muted"}`}>{text}</p>
    </div>
  );
}

function Arrow() {
  return <span aria-hidden className="text-muted text-2xl text-center rotate-90 lg:rotate-0">⇄</span>;
}

function FileMap() {
  const files = [
    ["app/page.tsx", "Home page (fura.dev)"],
    ["app/onboarding/page.tsx", "3-step setup: about you, upload clips, learn your style"],
    ["app/dashboard/page.tsx", "Your Creator DNA, credits, recent work"],
    ["app/dashboard/studio/page.tsx", "Write scripts, hooks and ideas"],
    ["app/dashboard/library/page.tsx", "Everything you've generated"],
    ["app/how-it-works/", "This page"],
    ["app/api/profile/route.ts", "Save “about you”"],
    ["app/api/clips/route.ts", "Upload links + list clips"],
    ["app/api/clips/transcribe/route.ts", "Start transcription after upload"],
    ["app/api/dna/route.ts", "Check transcripts, build the DNA"],
    ["app/api/generate/route.ts", "Write a script / hooks / ideas"],
    ["app/api/creations/route.ts", "Library: list and delete"],
    ["app/api/me/route.ts", "Dashboard data"],
    ["lib/prompts.ts", "Every AI instruction, in one place"],
    ["lib/ai.ts · lib/transcribe.ts · lib/research.ts", "Talk to the AI model, AssemblyAI, Exa"],
    ["lib/db.ts · lib/route.ts", "Database helpers, login check"],
    ["supabase/schema.sql", "The 7 tables + storage bucket"],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
      <h2 className="text-2xl font-bold">Where everything lives</h2>
      <dl className="mt-6 divide-y divide-line border-y border-line">
        {files.map(([file, job]) => (
          <div key={file} className="py-3 grid sm:grid-cols-[minmax(0,380px)_1fr] gap-1 sm:gap-6">
            <dt className="font-mono text-sm break-all">{file}</dt>
            <dd className="text-muted">{job}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-muted">The full written explanation is in <span className="font-mono text-ink">EXPLANATION.md</span> in the project folder.</p>
    </section>
  );
}
