"use client";
// app/dashboard/library/page.tsx: everything Fura has written for you. Filter, open, copy or delete.
import { useEffect, useState } from "react";
import { Loader2, Trash2, ChevronDown } from "lucide-react";
import { api } from "@/lib/client";
import { KIND_LABEL, timeAgo } from "@/lib/labels";
import { Markdown } from "@/components/markdown";
import { CopyButton } from "@/components/copy-button";

type Creation = { id: string; kind: string; input: string; output: string; created_at: string };

export default function LibraryPage() {
  const [items, setItems] = useState<Creation[] | null>(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(null);
    api(`/api/creations${filter ? `?kind=${filter}` : ""}`)
      .then((r) => {
        setItems(r.creations);
        // Coming from "Recent" on the home page opens that item
        const fromLink = window.location.hash.slice(1);
        if (fromLink) setOpen(fromLink);
      })
      .catch((e) => setError(e.message));
  }, [filter]);

  async function remove(id: string) {
    if (!confirm("Delete this from your Library? This can't be undone.")) return;
    await api(`/api/creations?id=${id}`, undefined, "DELETE").catch((e) => setError(e.message));
    setItems((list) => list?.filter((x) => x.id !== id) || null);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Library</h1>
        <div className="flex gap-1 p-1 rounded-full bg-surface border border-line" role="group" aria-label="Filter">
          {[["", "All"], ["script", "Scripts"], ["hooks", "Hooks"], ["ideas", "Ideas"]].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}
              className={`h-8 px-3.5 rounded-full text-sm font-medium ${filter === id ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mt-6 text-coral">{error}</p>}
      {!items && !error && <Loader2 className="mt-10 w-6 h-6 animate-spin text-ink" aria-label="Loading" />}
      {items?.length === 0 && <p className="mt-10 text-muted">Nothing here yet. Head to the Studio and write something.</p>}

      <ul className="mt-8 space-y-3">
        {items?.map((it) => {
          const isOpen = open === it.id;
          return (
            <li key={it.id} id={it.id} className="panel">
              <button onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen}
                className="w-full flex items-center gap-4 px-5 py-4 text-left">
                <span className="shrink-0 rounded-full bg-mark text-mark-ink text-xs font-semibold px-2.5 py-1">{KIND_LABEL[it.kind]}</span>
                <span className="flex-1 min-w-0 font-medium truncate">{it.input}</span>
                <span className="text-xs text-muted shrink-0 hidden sm:inline">{timeAgo(it.created_at)}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {isOpen && (
                <div className="px-5 sm:px-8 pb-6 border-t border-line pt-4">
                  <div className="flex justify-end gap-2">
                    <CopyButton text={it.output} />
                    <button onClick={() => remove(it.id)} className="btn-ghost h-9 px-3 text-sm hover:text-coral" aria-label="Delete">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                  <Markdown text={it.output} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
