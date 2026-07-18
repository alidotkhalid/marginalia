"use client";

import { useEffect, useState, useTransition } from "react";
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

  // Escape closes, and the page behind should not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
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

      {/* A centred dialog rather than a popover: the button sits in a narrow
          sidebar, where an anchored panel runs off the edge of the window. */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ask the reader"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <div className="card relative w-full max-w-sm space-y-3 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Ask the reader
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-ink-faint hover:text-ink"
              >
                close
              </button>
            </div>

            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={4}
              placeholder="What would you like to ask?"
              className="input resize-none text-sm"
              autoFocus
            />
            {error && <p className="text-sm text-oxblood">{error}</p>}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-ink-faint">
                {300 - q.length}
              </span>
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
        </div>
      )}
    </>
  );
}
