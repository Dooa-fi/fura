"use client";
// app/onboarding/page.tsx: first-time setup in 3 steps:
//   1. About you      → saved with POST /api/profile
//   2. Upload clips   → each file goes straight to storage, then POST /api/clips/transcribe
//   3. Learn style    → calls POST /api/dna every few seconds until the Creator DNA is ready

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Upload, X, AlertCircle, FileAudio } from "lucide-react";
import { api } from "@/lib/client";
import { Logo } from "@/components/logo";

const PLATFORMS = ["YouTube", "Instagram", "TikTok", "YouTube Shorts", "LinkedIn", "Podcast"];

export default function Onboarding() {
  const [step, setStep] = useState(1);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Logo href="/dashboard" />
          <StepDots step={step} />
        </div>
        <div className="mt-12">
          {step === 1 && <AboutYou onNext={() => setStep(2)} />}
          {step === 2 && <UploadClips onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && <LearnVoice onNeedClips={() => setStep(2)} />}
        </div>
      </div>
    </main>
  );
}

function StepDots({ step }: { step: number }) {
  const names = ["About you", "Your clips", "Your style"];
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Setup progress">
      {names.map((name, i) => (
        <li key={name} className="flex items-center gap-2" aria-current={step === i + 1 ? "step" : undefined}>
          <span className={`h-2 rounded-full transition-all ${step > i ? "w-8 bg-accent" : "w-2 bg-line"}`} />
          <span className="sr-only">{name}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------- Step 1 ----------
const GOALS = ["Grow my followers", "Get more views", "Build a community", "Sell a product or course", "Land brand deals", "Teach people something", "Send people to my link", "Just have fun"];
const AGES = ["Under 18", "18–24", "25–34", "35–44", "45+"];

type Goal = { goal: string; note: string };
type Mix = { men: number; women: number } | null; // the rest = non-binary / other genders

// Answers saved before this form changed were plain text; JSON.parse fails on those, so we start empty.
const readJSON = (raw: string | null) => { try { return JSON.parse(raw || ""); } catch { return null; } };

function AboutYou({ onNext }: { onNext: () => void }) {
  const [niche, setNiche] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [custom, setCustom] = useState({ on: false, from: "", to: "" }); // the "Other" age range
  const [mix, setMix] = useState<Mix>(null);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // goal whose pop-up is open
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If they've done this before, fill the form with what they wrote last time.
  useEffect(() => {
    api("/api/me").then(({ profile }) => {
      if (!profile.niche) return;
      setNiche(profile.niche);
      setPlatforms(profile.platforms || []);
      const g = readJSON(profile.goals);
      if (Array.isArray(g)) setGoals(g);
      const a = readJSON(profile.audience);
      if (a && typeof a === "object") { setAges((a.ages || []).filter((x: string) => AGES.includes(x)));
        const range = (a.ages || []).find((x: string) => !AGES.includes(x)); // a custom range like "13–17"
        if (range) { const [from = "", to = ""] = range.split("–"); setCustom({ on: true, from, to }); } setMix(a.mix || null); setNotes(a.notes || ""); }
      else if (profile.audience) setNotes(profile.audience);
    }).catch(() => {});
  }, []);

  const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  // Clicking a goal picks it and opens the pop-up; clicking a picked goal opens the pop-up again to edit or remove.
  function clickGoal(goal: string) {
    if (!goals.some((g) => g.goal === goal)) setGoals([...goals, { goal, note: "" }]);
    setEditing(goal);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const lo = Math.min(+custom.from, +custom.to), hi = Math.max(+custom.from, +custom.to);
      const range = custom.on && custom.from && custom.to ? [`${lo}–${hi}`] : [];
      await api("/api/profile", { niche, platforms, goals, audience: { ages: [...ages, ...range], mix, notes } });
      onNext();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <h1 className="text-4xl font-extrabold tracking-tight">Tell Fura about you</h1>
      <p className="mt-3 text-muted text-lg">Only the first question is required. The rest helps Fura write for the right people.</p>

      <div className="mt-10 space-y-9">
        <div>
          <label htmlFor="niche" className="label">What do you make videos about?</label>
          <input id="niche" className="field" required placeholder="e.g. Fitness for college students"
            value={niche} onChange={(e) => setNiche(e.target.value)} />
        </div>

        <fieldset>
          <legend className="label">Where do you post?</legend>
          <Chips options={PLATFORMS} picked={platforms} onClick={(p) => setPlatforms((list) => toggle(list, p))} />
        </fieldset>

        <fieldset>
          <legend className="label">What do you want your videos to do? <Optional /></legend>
          <Chips options={GOALS} picked={goals.map((g) => g.goal)} onClick={clickGoal} />
          {goals.some((g) => g.note) && (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {goals.filter((g) => g.note).map((g) => <li key={g.goal}><span className="font-semibold text-ink">{g.goal}:</span> {g.note}</li>)}
            </ul>
          )}
        </fieldset>

        <fieldset className="panel p-5 sm:p-6 space-y-7">
          <legend className="sr-only">Who watches you</legend>
          <div>
            <h2 className="font-bold text-lg">Who watches you? <Optional /></h2>
            <p className="text-sm text-muted mt-1">Best guesses are fine. Your analytics app shows the real numbers.</p>
          </div>

          <div>
            <p className="label" id="ages-label">Age groups</p>
            <Chips options={[...AGES, "Other"]} picked={custom.on ? [...ages, "Other"] : ages} labelledBy="ages-label"
              onClick={(a) => (a === "Other" ? setCustom((c) => ({ ...c, on: !c.on })) : setAges((list) => toggle(list, a)))} />
            {custom.on && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <label htmlFor="age-from" className="text-muted">From</label>
                <input id="age-from" type="number" min={5} max={99} inputMode="numeric" className="field w-20 h-10" placeholder="13"
                  value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                <label htmlFor="age-to" className="text-muted">to</label>
                <input id="age-to" type="number" min={5} max={99} inputMode="numeric" className="field w-20 h-10" placeholder="17"
                  value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
                <span className="text-muted">years old</span>
              </div>
            )}
          </div>

          <GenderMix mix={mix} onChange={setMix} />

          <div>
            <label htmlFor="audience" className="label">Describe a typical viewer</label>
            <textarea id="audience" rows={2} className="field resize-none" placeholder="e.g. Mostly guys who just joined a gym and don't know where to start"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </fieldset>
      </div>

      {error && <ErrorLine text={error} />}
      <div className="mt-10 flex justify-end">
        <button className="btn-primary" disabled={saving || !niche.trim()}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Continue
        </button>
      </div>

      {editing && (
        <GoalPopup
          goal={goals.find((g) => g.goal === editing) || { goal: editing, note: "" }}
          onSave={(note) => { setGoals(goals.map((g) => (g.goal === editing ? { ...g, note } : g))); setEditing(null); }}
          onRemove={() => { setGoals(goals.filter((g) => g.goal !== editing)); setEditing(null); }}
        />
      )}
    </form>
  );
}

const Optional = () => <span className="text-muted font-normal">(optional)</span>;

function Chips({ options, picked, onClick, labelledBy }: { options: string[]; picked: string[]; onClick: (x: string) => void; labelledBy?: string }) {
  return (
    <div className="flex flex-wrap gap-2" role={labelledBy ? "group" : undefined} aria-labelledby={labelledBy}>
      {options.map((x) => {
        const on = picked.includes(x);
        return (
          <button type="button" key={x} onClick={() => onClick(x)} aria-pressed={on}
            className={`h-10 px-4 rounded-full border text-sm font-medium transition inline-flex items-center gap-1.5 ${on ? "bg-ink text-paper border-ink" : "bg-surface border-line hover:border-ink/30"}`}>
            {on && <Check className="w-3.5 h-3.5" aria-hidden />}{x}
          </button>
        );
      })}
    </div>
  );
}

// One slider splits men and women. Other genders are opt-in: tap the link to add a second slider.
// We still save { men, women }; whatever is left of 100% is non-binary / other genders.
function GenderMix({ mix, onChange }: { mix: Mix; onChange: (m: Mix) => void }) {
  const saved = mix || { men: 50, women: 50 };
  const other = 100 - saved.men - saved.women;
  const [showOther, setShowOther] = useState(other > 0);
  useEffect(() => { if (other > 0) setShowOther(true); }, [other]); // saved answers load after the first render
  const split = saved.men + saved.women ? Math.round((saved.men / (saved.men + saved.women)) * 100) : 50; // men's share of men + women

  // Turn the two slider positions back into three percentages.
  function update(newSplit: number, newOther: number) {
    const men = Math.round(((100 - newOther) * newSplit) / 100);
    onChange({ men, women: 100 - newOther - men });
  }

  const bars = [
    { name: "Men", value: saved.men, color: "bg-ink" },
    { name: "Women", value: saved.women, color: "bg-mark" },
    ...(showOther ? [{ name: "Non-binary & other genders", value: other, color: "bg-coral" }] : []),
  ];

  return (
    <div>
      <label htmlFor="gender-split" className="label">Gender mix</label>
      <div className={`flex h-3 rounded-full overflow-hidden bg-line transition-opacity ${mix ? "" : "opacity-40"}`} aria-hidden>
        {bars.map((b) => <div key={b.name} className={`${b.color} transition-[width]`} style={{ width: `${b.value}%` }} />)}
      </div>
      <ul className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm transition-opacity ${mix ? "" : "opacity-40"}`}>
        {bars.map((b) => (
          <li key={b.name} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${b.color}`} aria-hidden />{b.name} <span className="font-semibold tabular-nums">{b.value}%</span></li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="text-muted w-14">Men</span>
        {/* Pulling the thumb toward a side means more of that side. */}
        <input id="gender-split" type="range" min={0} max={100} step={5} value={100 - split} onChange={(e) => update(100 - Number(e.target.value), other)}
          className="flex-1 accent-[rgb(var(--ink))]" aria-valuetext={`${saved.men}% men, ${saved.women}% women`} />
        <span className="text-muted w-14 text-right">Women</span>
      </div>

      {showOther ? (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <label htmlFor="gender-other" className="text-muted">Non-binary & other</label>
          <input id="gender-other" type="range" min={0} max={50} step={1} value={other} onChange={(e) => update(split, Number(e.target.value))}
            className="flex-1 accent-[rgb(var(--ink))]" aria-valuetext={`${other}%`} />
          <button type="button" className="text-muted hover:text-ink" onClick={() => { setShowOther(false); if (mix) update(split, 0); }} aria-label="Remove other genders">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button type="button" className="mt-3 text-sm font-medium underline decoration-mark decoration-2 underline-offset-4" onClick={() => setShowOther(true)}>
          + Add non-binary & other genders
        </button>
      )}
    </div>
  );
}

// The pop-up that opens after picking a goal. A native <dialog> gives us Esc-to-close and focus handling for free.
function GoalPopup({ goal, onSave, onRemove }: { goal: Goal; onSave: (note: string) => void; onRemove: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState(goal.note);
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} onClose={() => onSave(note)} aria-labelledby="goal-title"
      className="panel p-0 w-[min(92vw,460px)] backdrop:bg-ink/40 text-ink">
      <div className="p-6">
        <h2 id="goal-title" className="text-xl font-bold">{goal.goal}</h2>
        <label htmlFor="goal-note" className="mt-1 block text-sm text-muted">Add some context if you want. Fura reads it before writing.</label>
        <textarea id="goal-note" rows={3} autoFocus className="field resize-none mt-4" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={goal.goal.startsWith("Sell") ? "e.g. My ₹499 hostel workout plan, link in bio" : "e.g. Hit 100k on Instagram by March"} />
      </div>
      <div className="px-6 py-4 border-t border-line flex justify-between gap-3">
        <button type="button" className="text-sm text-muted hover:text-coral" onClick={onRemove}>Remove goal</button>
        <button type="button" className="btn-primary h-10" onClick={() => ref.current?.close()}>{note.trim() ? "Save" : "Skip"}</button>
      </div>
    </dialog>
  );
}

// ---------- Step 2 ----------
type Item = { key: string; file: File; progress: number; status: "waiting" | "uploading" | "done" | "error"; error?: string };

const MAX_MB = 50;

function UploadClips({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [already, setAlready] = useState(0); // clips uploaded in an earlier visit
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api("/api/clips").then((r) => setAlready(r.clips.filter((c: any) => c.status === "done" || c.status === "transcribing").length)).catch(() => {});
  }, []);

  const update = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...change } : it)));

  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map((file): Item => {
      const bad = !/^(audio|video)\//.test(file.type) ? "Not an audio or video file" : file.size > MAX_MB * 1024 * 1024 ? `Bigger than ${MAX_MB} MB` : undefined;
      return { key: `${file.name}-${file.size}-${Math.random()}`, file, progress: 0, status: bad ? "error" : "waiting", error: bad };
    });
    setItems((list) => [...list, ...added]);
  }

  async function uploadAll() {
    setBusy(true);
    for (const item of items.filter((i) => i.status === "waiting")) {
      try {
        update(item.key, { status: "uploading" });
        // 1. ask our server for a one-time upload link
        const { clipId, uploadUrl } = await api("/api/clips", { fileName: item.file.name, fileType: item.file.type, fileSize: item.file.size });
        // 2. send the file straight to storage, showing real progress
        await putFile(uploadUrl, item.file, (progress) => update(item.key, { progress }));
        // 3. tell our server it's there so transcription can start
        await api("/api/clips/transcribe", { clipId });
        update(item.key, { status: "done", progress: 100 });
      } catch (err: any) {
        update(item.key, { status: "error", error: err.message });
      }
    }
    setBusy(false);
  }

  const ready = items.filter((i) => i.status === "done").length + already;
  const waiting = items.filter((i) => i.status === "waiting").length;

  return (
    <div>
      <h1 className="text-4xl font-extrabold tracking-tight">Upload clips of you talking</h1>
      <p className="mt-3 text-muted text-lg">3 to 10 clips works best. Videos or voice notes, up to {MAX_MB} MB each. The more you talk in them, the better Fura gets.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`mt-8 rounded-2xl border-2 border-dashed p-10 text-center transition ${dragging ? "border-ink bg-soft" : "border-line bg-surface"}`}
      >
        <Upload className="mx-auto w-8 h-8 text-ink" aria-hidden />
        <p className="mt-3 font-semibold">Drop files here</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost mt-4 h-10">Choose files</button>
        <input ref={inputRef} type="file" multiple accept="audio/*,video/*" className="sr-only"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {already > 0 && <p className="mt-4 text-sm text-muted">{already} clip{already > 1 ? "s" : ""} already uploaded earlier.</p>}

      {items.length > 0 && (
        <ul className="mt-6 space-y-2">
          {items.map((it) => (
            <li key={it.key} className="panel px-4 py-3 flex items-center gap-3">
              <FileAudio className="w-5 h-5 text-muted shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{it.file.name}</p>
                {it.status === "error" ? (
                  <p className="text-xs text-coral">{it.error}</p>
                ) : (
                  <div className="mt-1.5 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${it.progress}%` }} />
                  </div>
                )}
              </div>
              {it.status === "done" && <Check className="w-5 h-5 text-mint" aria-label="Uploaded" />}
              {it.status === "uploading" && <Loader2 className="w-5 h-5 animate-spin text-ink" aria-label="Uploading" />}
              {!busy && (it.status === "waiting" || it.status === "error") && (
                <button onClick={() => setItems(items.filter((x) => x.key !== it.key))} aria-label={`Remove ${it.file.name}`}
                  className="p-1 rounded-full text-muted hover:text-ink"><X className="w-4 h-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        <button className="btn-ghost" onClick={onBack} disabled={busy}>Back</button>
        {waiting > 0 ? (
          <button className="btn-primary" onClick={uploadAll} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Upload {waiting} clip{waiting > 1 ? "s" : ""}
          </button>
        ) : (
          <button className="btn-primary" onClick={onNext} disabled={busy || ready === 0}>Learn my style</button>
        )}
      </div>
    </div>
  );
}

// Upload with XMLHttpRequest because fetch() can't report upload progress.
function putFile(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(file);
  });
}

// ---------- Step 3 ----------
type ClipProgress = { id: string; name: string; status: string };

function LearnVoice({ onNeedClips }: { onNeedClips: () => void }) {
  const router = useRouter();
  const [clips, setClips] = useState<ClipProgress[]>([]);
  const [dnaStatus, setDnaStatus] = useState("none");
  const [error, setError] = useState("");
  const [round, setRound] = useState(0); // bump to try again

  useEffect(() => {
    let stop = false;
    let first = true;
    async function tick() {
      try {
        const res = await api("/api/dna", { rebuild: first && round > 0 });
        first = false;
        if (stop) return;
        setClips(res.clips);
        setDnaStatus(res.dnaStatus);
        if (res.dnaStatus === "ready") return setTimeout(() => router.push("/dashboard"), 1800);
        if (res.dnaStatus === "failed" || res.dnaStatus === "no-clips") return;
      } catch (err: any) {
        if (stop) return;
        setError(err.message);
        return;
      }
      setTimeout(() => !stop && tick(), 4000);
    }
    setError("");
    tick();
    return () => { stop = true; };
  }, [round, router]);

  const label: Record<string, string> = { uploading: "Uploading", transcribing: "Listening", done: "Transcribed", failed: "Couldn't use this clip" };
  const isReady = dnaStatus === "ready";
  const failed = dnaStatus === "failed" || !!error;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${isReady ? "bg-mint" : failed ? "bg-coral" : "bg-coral animate-pulse"}`} aria-hidden />
        <h1 className="text-4xl font-extrabold tracking-tight">
          {isReady ? "Fura knows your style" : failed ? "Something went wrong" : "Learning your style"}
        </h1>
      </div>
      <p className="mt-3 text-muted text-lg" aria-live="polite">
        {isReady
          ? "Taking you to your dashboard."
          : failed
            ? error || "Fura couldn't build your style profile. Try again, or check the AI settings."
            : dnaStatus === "building"
              ? "All clips transcribed. Now studying how you talk. This takes about 30 seconds."
              : dnaStatus === "no-clips"
                ? "None of your clips could be used. Upload clips where you speak clearly."
                : "Transcribing your clips. Usually about a minute for short videos. You can keep this tab open."}
      </p>

      <ul className="mt-10 space-y-2">
        {clips.map((c) => (
          <li key={c.id} className="panel px-4 py-3 flex items-center gap-3">
            {c.status === "done" ? <Check className="w-5 h-5 text-mint" aria-hidden /> : c.status === "failed" ? <AlertCircle className="w-5 h-5 text-coral" aria-hidden /> : <Loader2 className="w-5 h-5 animate-spin text-ink" aria-hidden />}
            <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
            <span className={`text-xs ${c.status === "failed" ? "text-coral" : "text-muted"}`}>{label[c.status] || c.status}</span>
          </li>
        ))}
        <li className="panel px-4 py-3 flex items-center gap-3">
          {isReady ? <Check className="w-5 h-5 text-mint" aria-hidden /> : dnaStatus === "building" ? <Loader2 className="w-5 h-5 animate-spin text-ink" aria-hidden /> : <span className="w-5 h-5 rounded-full border-2 border-line" aria-hidden />}
          <span className="flex-1 text-sm font-semibold">Build your Creator DNA</span>
        </li>
      </ul>

      {(failed || dnaStatus === "no-clips") && (
        <div className="mt-8 flex gap-3">
          <button className="btn-ghost" onClick={onNeedClips}>Upload more clips</button>
          {dnaStatus !== "no-clips" && <button className="btn-primary" onClick={() => setRound(round + 1)}>Try again</button>}
        </div>
      )}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return <p role="alert" className="mt-6 text-sm text-coral flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {text}</p>;
}
