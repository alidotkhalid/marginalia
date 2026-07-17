"use client";

import { useState, useTransition } from "react";
import { askReader } from "@/app/actions";
import { Spinner } from "./Spinner";

// "Ask the reader": a follow-gated question box shown on a profile you follow.
export function AskButton({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await askReader(targetId, q);
      if (res.error) setError(res.error);
      else {
        setQ("");
        setSent(true);
        setOpen(false);
        setTimeout(() => setSent(false), 3000);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setError(null);
        }}
        className="btn-ghost"
      >
        {sent ? "Sent ✓" : "Ask"}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 space-y-2 rounded-card border border-parchment-dark bg-parchment p-3 shadow-card">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            Ask the reader
          </p>
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 300))}
            maxLength={300}
            rows={3}
            placeholder="What would you like to ask?"
            className="input resize-none text-sm"
            autoFocus
          />
          {error && <p className="text-sm text-oxblood">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-ink-faint">{300 - q.length}</span>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !q.trim()}
              className="btn-accent !py-1.5 text-sm"
            >
              {pending && <Spinner inline />}
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
