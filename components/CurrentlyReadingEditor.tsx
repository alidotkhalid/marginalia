"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import {
  setCurrentlyReading,
  clearCurrentlyReading,
  setReadingProgress,
} from "@/app/actions";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";

type Current = {
  title: string;
  author: string | null;
  cover_id: number | null;
} | null;

// Editable "Currently Reading" card (own profile only): pick a book, track
// progress with a slider, or clear it. Mirrors the reference's progress bar.
export function CurrentlyReadingEditor({
  current,
  progress,
}: {
  current: Current;
  progress: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(progress);
  const [pending, startTransition] = useTransition();

  function choose(book: BookResult) {
    startTransition(async () => {
      await setCurrentlyReading(book);
      setValue(0);
      setEditing(false);
      router.refresh();
    });
  }

  function clear() {
    startTransition(async () => {
      await clearCurrentlyReading();
      setValue(0);
      router.refresh();
    });
  }

  function commitProgress(next: number) {
    setValue(next);
    startTransition(async () => {
      await setReadingProgress(next);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="section-title text-lg">Currently Reading</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-mono uppercase tracking-wider text-ink-faint hover:text-brass"
            disabled={pending}
          >
            {current ? "change" : "set"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <BookSearch onSelect={choose} />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-mono text-ink-faint hover:text-oxblood"
          >
            cancel
          </button>
        </div>
      ) : current ? (
        <div className="flex gap-3">
          <BookCover coverId={current.cover_id} title={current.title} size="M" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-ink">
              {current.title}
            </p>
            <p className="truncate text-sm text-ink-faint">
              {current.author ?? "Unknown author"}
            </p>

            <div className="mt-3">
              <div className="progress">
                <span style={{ width: `${value}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-mono text-ink-faint">
                  {value}% read
                </span>
                <button
                  type="button"
                  onClick={clear}
                  disabled={pending}
                  className="text-xs font-mono text-ink-faint hover:text-oxblood"
                >
                  clear
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                onMouseUp={(e) => commitProgress(Number(e.currentTarget.value))}
                onTouchEnd={(e) => commitProgress(Number(e.currentTarget.value))}
                className="mt-2 w-full accent-brass"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-11 items-center justify-center rounded bg-parchment-dark text-ink-faint">
            <span className="text-lg">＋</span>
          </div>
          <p className="text-sm text-ink-faint">
            No book set yet. Tap &ldquo;set&rdquo; to choose what you&rsquo;re reading.
          </p>
        </div>
      )}
    </div>
  );
}
