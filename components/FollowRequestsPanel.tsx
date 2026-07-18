"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The follow-requests strip that sits at the top of Notifications. Clicking it
 * opens a panel over the page holding every pending request. The rows are
 * rendered on the server and handed in.
 */
export function FollowRequestsPanel({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

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
        onClick={() => setOpen(true)}
        className="card flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:border-brass/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-brass/15 text-brass">
          ✦
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Follow requests</span>
          <span className="block text-sm text-ink-faint">
            {count} {count === 1 ? "person is" : "people are"} waiting to follow
            you
          </span>
        </span>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-pill bg-brass px-2 text-xs font-bold text-forest-dark">
          {count}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Follow requests"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <div className="card relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl italic text-brass">
                Follow requests
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-ink-faint hover:text-ink"
              >
                close
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
