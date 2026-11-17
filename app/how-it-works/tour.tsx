"use client";
// The clickable part of the How-it-works page: steps on the left, the real code on the right.
import { useState } from "react";

export type TourStep = { title: string; where: string; explain: string; file: string; from?: string; to?: string; html: string };

export function CodeTour({ steps }: { steps: TourStep[] }) {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <div className="mt-10 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <ol className="space-y-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto pr-1">
        {steps.map((s, i) => (
          <li key={i}>
            <button onClick={() => setActive(i)} aria-current={i === active ? "step" : undefined}
              className={`w-full text-left rounded-xl px-3 py-2.5 flex gap-3 transition ${i === active ? "bg-soft" : "hover:bg-paper"}`}>
              <span className={`w-6 shrink-0 text-sm font-bold tabular-nums ${i === active ? "text-ink" : "text-muted"}`}>{i + 1}</span>
              <span>
                <span className={`block text-[15px] font-semibold leading-snug ${i === active ? "underline decoration-mark decoration-[3px] underline-offset-4" : ""}`}>{s.title}</span>
                <span className="block text-xs text-muted mt-0.5">{s.where}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <article className="min-w-0" aria-live="polite">
        <h3 className="text-2xl font-bold">{step.title}</h3>
        <p className="mt-3 text-lg text-muted leading-relaxed max-w-[65ch]">{step.explain}</p>
        <div className="mt-6 rounded-2xl border border-line bg-paper overflow-hidden">
          <div className="px-5 py-2.5 border-b border-line text-sm font-mono text-muted">{step.file}</div>
          <div className="code-block" dangerouslySetInnerHTML={{ __html: step.html }} />
        </div>
        <div className="mt-5 flex justify-between">
          <button className="btn-ghost h-10" disabled={active === 0} onClick={() => setActive(active - 1)}>Previous</button>
          <button className="btn-primary h-10" disabled={active === steps.length - 1} onClick={() => setActive(active + 1)}>Next step</button>
        </div>
      </article>
    </div>
  );
}
