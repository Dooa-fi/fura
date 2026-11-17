"use client";
// app/dashboard/page.tsx: Home: shows the Creator DNA Fura learned, credits, and recent work.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AudioLines } from "lucide-react";
import { api } from "@/lib/client";
import { KIND_LABEL, timeAgo } from "@/lib/labels";
import type { DNA } from "@/lib/prompts";

type Me = {
  profile: { niche: string | null };
  dna: DNA | null;
  dnaStatus: string;
  credits: { left: number; total: number };
  clipCount: number;
  recent: { id: string; kind: string; input: string; created_at: string }[];
};

export default function DashboardHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<Me>("/api/me").then(setMe).catch((e) => setError(e.message)); }, []);

  if (error) return <p role="alert" className="text-coral">Couldn&apos;t load your dashboard: {error}</p>;
  if (!me) return <Loader2 className="w-6 h-6 animate-spin text-ink" aria-label="Loading" />;
  if (!me.dna) return <NoVoiceYet started={!!me.profile.niche} />;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">{me.profile.niche}</p>
          <h1 className="text-4xl font-extrabold tracking-tight mt-1">Your style</h1>
        </div>
        <Credits left={me.credits.left} total={me.credits.total} />
      </div>

      <div className="mt-10 grid xl:grid-cols-[1fr_340px] gap-8 items-start">
        <VoiceCard dna={me.dna} clipCount={me.clipCount} />
        <div className="space-y-8 xl:sticky xl:top-8 grid sm:grid-cols-2 xl:block gap-8">
          <QuickStart />
          <Recent items={me.recent} />
        </div>
      </div>
    </div>
  );
}

function NoVoiceYet({ started }: { started: boolean }) {
  return (
    <div className="max-w-xl mt-10">
      <span className="grid place-items-center w-14 h-14 rounded-2xl bg-mark text-mark-ink"><AudioLines aria-hidden /></span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Teach Fura your style first</h1>
      <p className="mt-3 text-lg text-muted">Upload a few clips of you talking. Fura uses them to write everything the way you would.</p>
      <Link href="/onboarding" className="btn-primary mt-8">{started ? "Continue setup" : "Start setup"}</Link>
    </div>
  );
}

function Credits({ left, total }: { left: number; total: number }) {
  return (
    <div className="panel px-4 py-3 min-w-[200px]">
      <div className="flex justify-between gap-6 text-sm"><span className="text-muted">Credits this month</span><span className="font-semibold">{left}/{total}</span></div>
      <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(left / total) * 100}%` }} /></div>
    </div>
  );
}

// The Creator DNA, laid out like a one-page profile.
function VoiceCard({ dna, clipCount }: { dna: DNA; clipCount: number }) {
  const traits = [
    ["Tone", dna.tone],
    ["Pacing", dna.pacing],
    ["How you open", dna.hookStyle],
    ["How you talk to viewers", dna.audienceRelationship],
    ["How your videos flow", dna.structure],
  ];
  return (
    <article className="panel p-6 sm:p-8">
      <p className="text-sm text-muted">Learned from {clipCount} clip{clipCount === 1 ? "" : "s"}</p>
      <p className="mt-3 text-xl sm:text-2xl leading-snug font-medium">{dna.summary}</p>

      {dna.catchphrases?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {dna.catchphrases.map((c) => (
            <span key={c} className="rounded-full bg-mark text-mark-ink text-sm font-semibold px-3 py-1">&ldquo;{c}&rdquo;</span>
          ))}
        </div>
      )}

      <dl className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8">
        {traits.map(([name, value]) => (
          <div key={name}>
            <dt className="text-sm font-semibold">{name}</dt>
            <dd className="mt-1 text-muted leading-relaxed">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid sm:grid-cols-2 gap-8 border-t border-line pt-8">
        <RuleList title="Fura will" items={dna.dos} dot="bg-mint" />
        <RuleList title="Fura won't" items={dna.donts} dot="bg-coral" />
      </div>

      {dna.sampleLines?.length > 0 && (
        <div className="mt-8 border-t border-line pt-8">
          <h2 className="text-sm font-semibold">Lines that sound most like you</h2>
          <ul className="mt-3 space-y-3">
            {dna.sampleLines.slice(0, 5).map((line) => (
              <li key={line} className="border-l-2 border-mark pl-4 text-muted italic">{line}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function RuleList({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {(items || []).map((x) => (
          <li key={x} className="flex gap-3 text-muted leading-relaxed"><span className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />{x}</li>
        ))}
      </ul>
    </div>
  );
}

function QuickStart() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  return (
    <form className="panel p-5" onSubmit={(e) => { e.preventDefault(); router.push(`/dashboard/studio?topic=${encodeURIComponent(topic)}`); }}>
      <label htmlFor="quick" className="label">What&apos;s your next video about?</label>
      <textarea id="quick" rows={3} className="field resize-none" placeholder="e.g. Why most beginners quit the gym in week 3"
        value={topic} onChange={(e) => setTopic(e.target.value)} />
      <button className="btn-primary w-full mt-3" disabled={!topic.trim()}>Write it</button>
    </form>
  );
}

function Recent({ items }: { items: Me["recent"] }) {
  return (
    <section>
      <div className="flex justify-between items-baseline">
        <h2 className="font-semibold">Recent</h2>
        <Link href="/dashboard/library" className="text-sm font-medium underline decoration-mark decoration-2 underline-offset-4">See all</Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing yet. Your scripts, hooks and ideas will show up here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="py-3">
              <Link href={`/dashboard/library#${it.id}`} className="block group">
                <p className="text-sm font-medium truncate group-hover:underline">{it.input}</p>
                <p className="text-xs text-muted mt-0.5">{KIND_LABEL[it.kind]} · {timeAgo(it.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
