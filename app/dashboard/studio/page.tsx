"use client";
// app/dashboard/studio/page.tsx: where you write. Pick Script, Hooks or Ideas, type a topic, press Write.
// It sends one request to POST /api/generate and shows the answer.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/client";
import { Markdown } from "@/components/markdown";
import { CopyButton } from "@/components/copy-button";

type Kind = "script" | "hooks" | "ideas";

const KINDS: { id: Kind; label: string; cost: number; placeholder: string; prompt: string }[] = [
  { id: "script", label: "Script", cost: 2, prompt: "What's the video about?", placeholder: "e.g. 3 mistakes I made in my first year of lifting" },
  { id: "hooks", label: "Hooks", cost: 1, prompt: "What's the video about?", placeholder: "e.g. Why I stopped doing cardio" },
  { id: "ideas", label: "Ideas", cost: 1, prompt: "What theme do you want ideas around?", placeholder: "e.g. Gym on a student budget" },
];

const ANGLES = ["Curiosity", "Story", "Bold claim", "Question", "Contrarian"];

export default function StudioPage() {
  return <Suspense><Studio /></Suspense>; // Suspense is needed because we read ?topic= from the URL
}

function Studio() {
  const params = useSearchParams();
  const [kind, setKind] = useState<Kind>((params.get("kind") as Kind) || "script");
  const [topic, setTopic] = useState(params.get("topic") || "");
  const [length, setLength] = useState<"short" | "long">("short");
  const [research, setResearch] = useState(false);
  const [angle, setAngle] = useState(ANGLES[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ output: string } | null>(null);

  const [credits, setCredits] = useState<number | null>(null);
  const [canResearch, setCanResearch] = useState(false);
  useEffect(() => {
    api("/api/me").then((me) => { setCredits(me.credits.left); setCanResearch(me.canResearch); }).catch(() => {});
  }, []);

  const current = KINDS.find((k) => k.id === kind)!;

  async function write(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api("/api/generate", { kind, topic, length, research: canResearch && research, angle });
      setResult(res.creation);
      setCredits(res.creditsLeft);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-4xl font-extrabold tracking-tight">Studio</h1>

      <div className="mt-8 grid xl:grid-cols-[380px_1fr] gap-8 items-start">
        {/* ---- Left: what to write ---- */}
        <form onSubmit={write} className="panel p-5 sm:p-6 xl:sticky xl:top-8">
          <div role="tablist" aria-label="What to write" className="grid grid-cols-3 gap-1 p-1 rounded-full bg-paper border border-line">
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}
                className={`h-9 rounded-full text-sm font-semibold transition ${kind === k.id ? "bg-surface shadow-sm text-ink" : "text-muted hover:text-ink"}`}>
                {k.label}
              </button>
            ))}
          </div>

          <label htmlFor="topic" className="label mt-6">{current.prompt}</label>
          <textarea id="topic" rows={4} className="field resize-none" placeholder={current.placeholder}
            value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={500} />

          {kind === "script" && (
            <>
              <fieldset className="mt-5">
                <legend className="label">Length</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([["short", "Short", "under 1 min"], ["long", "Long", "6–8 min"]] as const).map(([id, name, hint]) => (
                    <button key={id} type="button" aria-pressed={length === id} onClick={() => setLength(id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${length === id ? "border-ink bg-soft" : "border-line hover:border-ink/30"}`}>
                      <span className="block text-sm font-semibold">{name}</span>
                      <span className="block text-xs text-muted">{hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {canResearch && (
              <label className="mt-5 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 accent-ink" checked={research} onChange={(e) => setResearch(e.target.checked)} />
                <span>
                  <span className="block text-sm font-semibold">Research the web first</span>
                  <span className="block text-xs text-muted">Pulls real facts and links into the script. Takes a bit longer.</span>
                </span>
              </label>
              )}
            </>
          )}

          {kind === "hooks" && (
            <fieldset className="mt-5">
              <legend className="label">Angle</legend>
              <div className="flex flex-wrap gap-2">
                {ANGLES.map((a) => (
                  <button key={a} type="button" aria-pressed={angle === a} onClick={() => setAngle(a)}
                    className={`h-9 px-3.5 rounded-full border text-sm transition ${angle === a ? "bg-ink text-paper border-ink" : "border-line hover:border-ink/30"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <button className="btn-primary w-full mt-6" disabled={loading || !topic.trim()}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Writing…" : `Write ${current.label.toLowerCase()}`}
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Uses {current.cost} credit{current.cost > 1 ? "s" : ""}{credits !== null && ` · ${credits} left this month`}
          </p>
        </form>

        {/* ---- Right: the result ---- */}
        <section aria-live="polite" className="panel min-h-[420px] p-6 sm:p-10">
          {error && (
            <div role="alert" className="flex items-start gap-3 text-coral">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
                {error.includes("style") && <Link href="/onboarding" className="text-sm underline">Set up your style</Link>}
              </div>
            </div>
          )}

          {loading && <Writing research={kind === "script" && research} />}

          {!loading && !error && !result && (
            <div className="h-full grid place-items-center text-center py-16">
              <div>
                <p className="text-2xl font-bold">Your words will show up here.</p>
                <p className="mt-2 text-muted">Everything you write is saved to your Library.</p>
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="flex justify-end -mt-2 mb-2"><CopyButton text={result.output} /></div>
              <Markdown text={result.output} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Writing({ research }: { research: boolean }) {
  return (
    <div className="space-y-4" aria-label="Writing">
      <p className="text-muted flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse" />
        {research ? "Researching the web, then writing in your style…" : "Writing in your style…"}
      </p>
      {[90, 75, 82, 60, 70].map((w, i) => (
        <div key={i} className="h-3 rounded-full bg-line animate-pulse" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
