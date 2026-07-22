"use client";

import { useState, useTransition } from "react";
import { reportContent } from "@/app/actions";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";

const REASONS = [
  "Spam or advertising",
  "Harassment or hate",
  "Sexual or explicit content",
  "Violence or self-harm",
  "Misinformation",
  "Something else",
];

/**
 * A quiet "report" affordance on reads and comments. Opens a small dialog with
 * a reason, files the report, and thanks the reader. One report per item.
 */
export function ReportButton({
  kind,
  id,
  compact = false,
}: {
  kind: "read" | "comment";
  id: string;
  /** Smaller styling for the comment row. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const full =
      reason === "Something else" && note.trim()
        ? note.trim()
        : note.trim()
        ? `${reason}: ${note.trim()}`
        : reason;
    startTransition(async () => {
      const res = await reportContent({ kind, id, reason: full });
      if (res?.error) setError(res.error);
      else setDone(true);
    });
  }

  function close() {
    setOpen(false);
    // Reset after the dialog has gone, so it is fresh next time.
    setTimeout(() => {
      setDone(false);
      setReason(REASONS[0]);
      setNote("");
      setError(null);
    }, 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "font-mono text-xs text-ink-faint hover:text-oxblood"
            : "font-mono text-xs text-ink-faint hover:text-oxblood"
        }
      >
        report
      </button>

      {open && (
        <Modal label="Report content" onClose={close} maxWidth="max-w-sm">
          {done ? (
            <div className="text-center">
              <p className="font-display text-xl text-ink">Thank you.</p>
              <p className="mt-1 text-sm text-ink-faint">
                We will take a look. You can also block this reader from their
                profile.
              </p>
              <button onClick={close} className="btn-accent mt-5">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl italic text-brass">
                  Report this {kind === "comment" ? "comment" : "read"}
                </h2>
                <button
                  onClick={close}
                  className="font-mono text-xs text-ink-faint hover:text-ink"
                >
                  close
                </button>
              </div>

              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft"
                  >
                    <input
                      type="radio"
                      name="reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-brass"
                    />
                    {r}
                  </label>
                ))}
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Anything you want to add (optional)"
                className="input mt-3 resize-none text-sm"
              />

              {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={close}
                  className="font-mono text-xs text-ink-faint hover:text-ink"
                >
                  cancel
                </button>
                <button
                  onClick={submit}
                  disabled={pending}
                  className="btn-accent !py-2 text-sm"
                >
                  {pending && <Spinner inline />}
                  {pending ? "Sending…" : "Report"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
