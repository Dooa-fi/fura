"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="btn-ghost h-9 px-3 text-sm"
    >
      {copied ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
