"use client";
// app/dashboard/studio/results.tsx: how the Studio shows what Fura wrote, and the loading state while it writes.
// The API sends the checked JSON (see lib/outputs.ts), so each kind gets its own clean layout.
import { useEffect, useState } from "react";
import { Check, Copy, MonitorPlay, PenLine, Sparkles, ExternalLink } from "lucide-react";
import type { Script, Hooks, Ideas } from "@/lib/outputs";

export type Kind = "script" | "hooks" | "ideas";
export type Result = {
  kind: Kind;
  output: string; // the Markdown version (what "Copy all" copies and the Library keeps)
  data: Script | Hooks | Ideas;
  length: { words: number; seconds: number } | null;
  sources: { title: string; url: string }[];
};

// ---------- Loading ----------

// What Fura is doing, step by step. The steps move on a timer: it's an honest "still working", not a progress bar.
const STEPS: Record<Kind, string[]> = {
  script: ["Reading your style", "Writing the hook", "Writing the middle", "Checking it sounds like you"],
  hooks: ["Reading your style", "Trying different openings", "Picking the 7 strongest"],
  ideas: ["Reading your style", "Finding angles your audience clicks", "Picking the 10 best"],
};

export function Writing({ kind, research }: { kind: Kind; research: boolean }) {
  const steps = research && kind === "script" ? ["Researching the web", ...STEPS.script] : STEPS[kind];
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const step = Math.min(Math.floor(seconds / 5), steps.length - 1);

  return (
    <div aria-busy="true">
      <ol className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-live="polite">
        {steps.map((name, i) => (
          <li key={name} className={`flex items-center gap-2 ${i < step ? "text-muted" : i === step ? "text-ink font-semibold" : "text-muted/50"}`}>
            {i < step ? <Check className="w-4 h-4 text-mint" aria-hidden /> : (
              <span className={`w-2 h-2 rounded-full ${i === step ? "bg-coral motion-safe:animate-pulse" : "bg-line"}`} aria-hidden />
            )}
            {name}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted tabular-nums">{seconds}s · usually 10 to 30 seconds</p>

      <div className="mt-8 motion-safe:animate-pulse" aria-hidden>
        {kind === "script" && [3, 2, 3, 2].map((rows, i) => (
          <div key={i} className="py-5 border-t border-line first:border-0">
            <div className="h-3 w-20 rounded-full bg-line" />
            {Array.from({ length: rows }, (_, r) => <div key={r} className="mt-3 h-3.5 rounded-full bg-soft" style={{ width: `${92 - r * 14}%` }} />)}
          </div>
        ))}
        {kind === "hooks" && Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex gap-4 py-4 border-t border-line first:border-0">
            <div className="h-4 w-4 rounded bg-line" />
            <div className="flex-1"><div className="h-4 rounded-full bg-soft" style={{ width: `${85 - (i % 3) * 12}%` }} /><div className="mt-2 h-3 w-1/2 rounded-full bg-line" /></div>
          </div>
        ))}
        {kind === "ideas" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-xl border border-line p-4"><div className="h-4 w-4/5 rounded-full bg-soft" /><div className="mt-3 h-3 rounded-full bg-line" /><div className="mt-2 h-3 w-2/3 rounded-full bg-line" /></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Small copy button (icon, or icon + label) ----------

export function Copier({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={label ? "btn-ghost h-9 px-3 text-sm" : "shrink-0 grid place-items-center w-9 h-9 rounded-full text-muted hover:text-ink hover:bg-soft"}
      aria-label={label ? undefined : copied ? "Copied" : "Copy"}
    >
      {copied ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
      {label && (copied ? "Copied" : label)}
    </button>
  );
}

// ---------- Script ----------

const time = (s: number) => (s < 60 ? `${s} sec` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} sec`);

export function ScriptView({ result }: { result: Result }) {
  const script = result.data as Script;
  const spoken = script.sections.map((s) => s.lines).join("\n\n"); // just the words to say, for a teleprompter

  return (
    <article>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-tight">{script.title}</h2>
          {result.length && (
            <p className="mt-1 text-sm text-muted">About {time(result.length.seconds)} to say · {result.length.words} words</p>
          )}
        </div>
        <div className="flex gap-2">
          <Copier text={spoken} label="Copy words only" />
          <Copier text={result.output} label="Copy all" />
        </div>
      </header>

      <ol className="mt-6">
        {script.sections.map((s, i) => {
          const isHook = i === 0;
          return (
            <li key={i} className={`py-5 border-t border-line ${isHook ? "border-t-0 pl-4 -ml-4 border-l-4 !border-l-mark" : ""}`}>
              <h3 className="text-sm font-semibold text-muted">{s.heading}</h3>
              <p className={`mt-1.5 whitespace-pre-line leading-relaxed ${isHook ? "text-xl font-semibold" : "text-lg"}`}>{s.lines}</p>
              {s.onScreen && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-soft px-3 py-2 text-sm text-muted">
                  <MonitorPlay className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                  <span><span className="sr-only">On screen: </span>{s.onScreen}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {result.sources.length > 0 && (
        <footer className="mt-4 pt-5 border-t border-line">
          <h3 className="text-sm font-semibold text-muted">Sources</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {result.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline decoration-mark decoration-2 underline-offset-2">{s.title}<ExternalLink className="w-3.5 h-3.5" aria-hidden /></a></li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}

// ---------- Hooks ----------

export function HooksView({ result, onUseHook }: { result: Result; onUseHook: (hook: string) => void }) {
  const { hooks } = result.data as Hooks;
  return (
    <article>
      <header className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">7 hooks</h2>
        <Copier text={result.output} label="Copy all" />
      </header>
      <ol className="mt-4">
        {hooks.map((h, i) => (
          <li key={i} className="group flex gap-4 py-4 border-t border-line first:border-0">
            <span className="w-5 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-muted">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold leading-snug">{h.line}</p>
              {h.why && <p className="mt-1 text-sm text-muted">{h.why}</p>}
              <button type="button" onClick={() => onUseHook(h.line)}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium underline decoration-mark decoration-2 underline-offset-4 hover:decoration-ink">
                <PenLine className="w-3.5 h-3.5" aria-hidden /> Write a script with this hook
              </button>
            </div>
            <Copier text={h.line} />
          </li>
        ))}
      </ol>
    </article>
  );
}

// ---------- Ideas ----------

export function IdeasView({ result, onPick }: { result: Result; onPick: (kind: Kind, topic: string) => void }) {
  const { ideas } = result.data as Ideas;
  return (
    <article>
      <header className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">10 video ideas</h2>
        <Copier text={result.output} label="Copy all" />
      </header>
      <ul className="mt-5 grid sm:grid-cols-2 gap-3">
        {ideas.map((idea, i) => (
          <li key={i} className="rounded-xl border border-line p-4 flex flex-col">
            <p className="font-semibold leading-snug">{idea.title}</p>
            {idea.angle && <p className="mt-1.5 text-sm text-muted flex-1">{idea.angle}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => onPick("script", idea.title)} className="btn-ghost h-8 px-3 text-xs"><PenLine className="w-3.5 h-3.5" aria-hidden /> Write script</button>
              <button type="button" onClick={() => onPick("hooks", idea.title)} className="btn-ghost h-8 px-3 text-xs"><Sparkles className="w-3.5 h-3.5" aria-hidden /> Get hooks</button>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
