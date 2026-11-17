"use client";
// app/how-it-works/file-graph.tsx: a map of our files and the links between them.
// Folders open when clicked. A line means "this file imports that file" (or calls that service).
// Lines attach to the deepest thing you can see: the file if its folder is open, otherwise the folder.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Folder } from "lucide-react";

export type GraphFile = { path: string; desc: string; imports: string[]; services: string[] };

const SERVICES = ["Clerk", "Supabase", "AssemblyAI", "AI model", "Exa"];
const SERVICE_JOB: Record<string, string> = { Clerk: "login", Supabase: "database + files", AssemblyAI: "speech to text", "AI model": "writing", Exa: "web search" };
// Which top-level card goes in which column: pages on the left, helpers in the middle, services on the right.
const COLUMNS = [["app"], ["components", "middleware.ts"], ["lib"]];

// "app/api/me/route.ts" → card "app", folder "api", name "me/route.ts"
function place(path: string) {
  const parts = path.split("/");
  if (parts.length === 1) return { card: path, sub: null, name: path };
  if (parts[0] === "app" && parts.length > 2) return { card: "app", sub: parts[1], name: parts.slice(2).join("/") };
  return { card: parts[0], sub: null, name: parts.slice(1).join("/") };
}

type Line = { from: string; to: string; files: string[]; count: number };
type Rect = { left: number; right: number; mid: number };

export function FileGraph({ files }: { files: GraphFile[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string | null>(null); // a file you clicked
  const [hover, setHover] = useState<string | null>(null);   // anything under the mouse
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const box = useRef<HTMLDivElement>(null);

  const byPath = Object.fromEntries(files.map((f) => [f.path, f]));
  const usedBy = (path: string) => files.filter((f) => f.imports.includes(path)).map((f) => f.path);

  // The box a file's lines should attach to right now.
  function anchor(path: string) {
    const { card, sub } = place(path);
    if (card === path) return `file:${path}`;             // a single file shown as its own card
    if (!open.has(card)) return `dir:${card}`;
    if (sub && !open.has(`${card}/${sub}`)) return `dir:${card}/${sub}`;
    return `file:${path}`;
  }

  // Merge links that land on the same two boxes into one thicker line.
  const lines = new Map<string, Line>();
  const link = (from: string, to: string, file: string, other: string) => {
    if (from === to) return;
    const key = `${from}>${to}`;
    const line = lines.get(key) || { from, to, files: [], count: 0 };
    line.files.push(file, other);
    line.count++;
    lines.set(key, line);
  };
  for (const f of files) {
    for (const imp of f.imports) link(anchor(f.path), anchor(imp), f.path, imp);
    for (const s of f.services) link(anchor(f.path), `svc:${s}`, f.path, `svc:${s}`);
  }

  // Measure where every box is on screen, so the lines can be drawn between them.
  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    const next: Record<string, Rect> = {};
    el.querySelectorAll<HTMLElement>("[data-anchor]").forEach((node) => {
      const r = node.getBoundingClientRect();
      next[node.dataset.anchor!] = { left: r.left - base.left, right: r.right - base.left, mid: r.top - base.top + r.height / 2 };
    });
    setRects(next);
    setSize({ w: base.width, h: base.height });
  }, []);

  // Re-measure every frame while a folder is opening, so lines glide with it.
  useLayoutEffect(() => {
    let frame = 0;
    const end = performance.now() + 450;
    const tick = () => { measure(); if (performance.now() < end) frame = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [open, measure]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (box.current) observer.observe(box.current);
    return () => observer.disconnect();
  }, [measure]);

  const toggle = (id: string) => setOpen((now) => { const next = new Set(now); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // Clicking a file in the side panel opens its folders first, then selects it.
  function pick(path: string) {
    const { card, sub } = place(path);
    setOpen((now) => new Set([...now, card, ...(sub ? [`${card}/${sub}`] : [])]));
    setPicked(path);
  }

  const focus = hover || (picked ? anchor(picked) : null);
  const lit = (l: Line) => !!focus && (l.from === focus || l.to === focus || (!!picked && !hover && l.files.includes(picked)));

  // A curve from the right side of one box to the left side of another.
  // If both are in the same column, the curve loops out to the right and comes back.
  function curve(l: Line) {
    const a = rects[l.from], b = rects[l.to];
    if (!a || !b) return "";
    if (b.left > a.right + 8) {
      const bend = Math.max(40, (b.left - a.right) / 2);
      return `M ${a.right} ${a.mid} C ${a.right + bend} ${a.mid} ${b.left - bend} ${b.mid} ${b.left} ${b.mid}`;
    }
    const out = 34 + Math.min(40, Math.abs(b.mid - a.mid) / 6);
    return `M ${a.right} ${a.mid} C ${a.right + out} ${a.mid} ${b.right + out} ${b.mid} ${b.right} ${b.mid}`;
  }

  const cards = (ids: string[]) => ids.map((id) => {
    const inside = files.filter((f) => place(f.path).card === id);
    if (!inside.length) return null;
    if (inside.length === 1 && inside[0].path === id) {
      return <FileRow key={id} card file={inside[0]} usedBy={usedBy(id).length} picked={picked} setPicked={setPicked} setHover={setHover} />;
    }
    const subs = Array.from(new Set(inside.map((f) => place(f.path).sub).filter(Boolean))) as string[];
    const loose = inside.filter((f) => !place(f.path).sub);
    const outside = (f: GraphFile) => f.imports.filter((i) => place(i).card !== id).length + f.services.length;
    return (
      <Card key={id} id={id} title={`${id}/`} meta={`${inside.length} files, ${inside.reduce((n, f) => n + outside(f), 0)} links out`}
        open={open.has(id)} onToggle={() => toggle(id)} setHover={setHover}>
        {subs.map((sub) => {
          const subFiles = inside.filter((f) => place(f.path).sub === sub);
          const subId = `${id}/${sub}`;
          return (
            <div key={sub}>
              <button data-anchor={`dir:${subId}`} onClick={() => toggle(subId)} onMouseEnter={() => setHover(`dir:${subId}`)} onMouseLeave={() => setHover(null)}
                aria-expanded={open.has(subId)} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-soft text-left font-mono text-[13px]">
                <ChevronRight className={`w-3.5 h-3.5 text-muted transition-transform ${open.has(subId) ? "rotate-90" : ""}`} aria-hidden />
                <Folder className="w-3.5 h-3.5 text-muted" aria-hidden />
                <span className="flex-1">{sub}/</span>
                <span className="text-muted text-xs">{subFiles.length}</span>
              </button>
              <Reveal open={open.has(subId)}>
                <div className="ml-5 border-l border-line pl-1">
                  {subFiles.map((f) => <FileRow key={f.path} file={f} usedBy={usedBy(f.path).length} picked={picked} setPicked={setPicked} setHover={setHover} />)}
                </div>
              </Reveal>
            </div>
          );
        })}
        {loose.map((f) => <FileRow key={f.path} file={f} usedBy={usedBy(f.path).length} picked={picked} setPicked={setPicked} setHover={setHover} />)}
      </Card>
    );
  });

  const sel = picked ? byPath[picked] : null;
  const totalLinks = files.reduce((n, f) => n + f.imports.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{files.length} files and {totalLinks} links between them. The number next to a file shows how many other files use it.</p>
        <div className="flex gap-2">
          <button className="btn-ghost h-9 px-3 text-sm" onClick={() => setOpen(new Set(files.flatMap((f) => { const p = place(f.path); return [p.card, ...(p.sub ? [`${p.card}/${p.sub}`] : [])]; })))}>Open all</button>
          <button className="btn-ghost h-9 px-3 text-sm" onClick={() => { setOpen(new Set()); setPicked(null); }}>Close all</button>
        </div>
      </div>

      <div ref={box} className="relative mt-5 grid lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-6 lg:gap-x-16 items-start">
        {/* The lines sit behind the cards. Hidden on small screens, where the cards stack. */}
        <svg className="hidden lg:block absolute inset-0 pointer-events-none overflow-visible" width={size.w} height={size.h} aria-hidden>
          {Array.from(lines.values()).map((l) => {
            const on = lit(l);
            return (
              <path key={l.from + l.to} d={curve(l)} fill="none" className={`graph-edge ${on ? "flow-active" : ""}`}
                stroke={on ? "rgb(var(--ink))" : "rgb(var(--muted))"} strokeWidth={on ? 2 : 0.9 + Math.min(l.count, 6) * 0.25}
                opacity={focus ? (on ? 1 : 0.1) : 0.45} />
            );
          })}
        </svg>

        {/* The middle column starts lower, so lines from app/ to lib/ pass above it instead of behind it. */}
        {COLUMNS.map((ids, i) => <div key={i} className={`relative space-y-6 ${i === 1 ? "lg:mt-44" : ""}`}>{cards(ids)}</div>)}

        <Card id="services" title="Outside services" meta="Rented, not built" open fixed setHover={() => {}}>
          {SERVICES.map((s) => (
            <div key={s} data-anchor={`svc:${s}`} onMouseEnter={() => setHover(`svc:${s}`)} onMouseLeave={() => setHover(null)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg hover:bg-soft text-[13px]">
              <span className="font-semibold">{s}</span><span className="text-muted text-xs">{SERVICE_JOB[s]}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="mt-8 panel p-5 sm:p-6 min-h-[132px]" aria-live="polite">
        {sel ? (
          <div key={sel.path} className="step-in">
            <p className="font-mono font-semibold break-all">{sel.path}</p>
            {sel.desc && <p className="mt-1 text-muted">{sel.desc}</p>}
            <div className="mt-5 grid sm:grid-cols-3 gap-6 text-sm">
              <LinkList title="Uses" items={sel.imports} onPick={pick} />
              <LinkList title="Used by" items={usedBy(sel.path)} onPick={pick} />
              <div>
                <p className="font-semibold">Talks to</p>
                <p className="mt-2 text-muted">{sel.services.join(", ") || "Nothing outside"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted">Pick a file to see what it does, what it uses, and what uses it. Hover a folder or service to light up its links.</p>
        )}
      </div>
    </div>
  );
}

function Card({ id, title, meta, open, fixed, onToggle, setHover, children }: {
  id: string; title: string; meta: string; open: boolean; fixed?: boolean; onToggle?: () => void; setHover: (h: string | null) => void; children: React.ReactNode;
}) {
  return (
    <section data-anchor={fixed ? undefined : `dir:${id}`} className="relative z-10 rounded-2xl border border-line bg-surface shadow-[0_12px_30px_-18px_rgba(0,0,0,.35)]"
      onMouseEnter={() => !open && setHover(`dir:${id}`)} onMouseLeave={() => setHover(null)}>
      <button onClick={onToggle} disabled={fixed} aria-expanded={fixed ? undefined : open}
        className="w-full flex items-start gap-2 px-4 py-3 text-left disabled:cursor-default">
        <span className="flex-1">
          <span className={`block font-bold ${fixed ? "" : "font-mono"}`}>{title}</span>
          <span className="block text-xs text-muted mt-0.5">{meta}</span>
        </span>
        {!fixed && <ChevronRight className={`mt-1 w-4 h-4 text-muted transition-transform duration-300 ${open ? "rotate-90" : ""}`} aria-hidden />}
      </button>
      <Reveal open={open}><div className="px-1.5 pb-2 border-t border-line pt-1.5">{children}</div></Reveal>
    </section>
  );
}

// Smoothly opens and closes. Hidden content can't be tabbed into while closed.
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
      <div className="overflow-hidden" {...(!open && ({ inert: "" } as any))}>{children}</div>
    </div>
  );
}

function FileRow({ file, usedBy, card, picked, setPicked, setHover }: {
  file: GraphFile; usedBy: number; card?: boolean; picked: string | null; setPicked: (p: string | null) => void; setHover: (h: string | null) => void;
}) {
  const on = picked === file.path;
  const name = card ? file.path : place(file.path).name;
  return (
    <button data-anchor={`file:${file.path}`} onClick={() => setPicked(on ? null : file.path)} aria-pressed={on} title={file.desc}
      onMouseEnter={() => setHover(`file:${file.path}`)} onMouseLeave={() => setHover(null)}
      className={`relative z-10 w-full flex items-center gap-2 text-left font-mono transition ${card ? "rounded-2xl border px-4 py-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,.35)]" : "rounded-lg px-3 py-1.5 text-[13px]"}
        ${on ? "bg-ink text-paper border-ink" : card ? "bg-surface border-line hover:border-ink/30" : "hover:bg-soft"}`}>
      {!card && usedBy > 0 && <span className={`w-1.5 h-1.5 rounded-sm shrink-0 ${on ? "bg-mark" : "bg-muted/50"}`} aria-hidden />}
      <span className={`flex-1 truncate ${card ? "font-bold" : ""}`}>{name}</span>
      {!card && usedBy > 0 && <span className={`text-xs tabular-nums ${on ? "text-paper/70" : "text-muted"}`} title="How many files use this one">{usedBy}</span>}
    </button>
  );
}

function LinkList({ title, items, onPick }: { title: string; items: string[]; onPick: (p: string) => void }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      {items.length === 0 ? <p className="mt-2 text-muted">Nothing</p> : (
        <ul className="mt-2 space-y-1">
          {items.map((p) => (
            <li key={p}><button className="font-mono text-[13px] text-left break-all underline decoration-line underline-offset-4 hover:decoration-mark" onClick={() => onPick(p)}>{p}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
