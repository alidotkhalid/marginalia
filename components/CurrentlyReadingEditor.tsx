"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { setCurrentlyReading, clearCurrentlyReading } from "@/app/actions";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";

// Shown only on your own profile. Search Open Library to set what you're reading,
// or clear it. Uses the existing server actions; the page revalidates after.
export function CurrentlyReadingEditor({
  current,
}: {
  current: { title: string; author: string | null; cover_id: number | null } | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(book: BookResult) {
    startTransition(async () => {
      await setCurrentlyReading(book);
      setEditing(false);
      router.refresh();
    });
  }

  function clear() {
    startTransition(async () => {
      await clearCurrentlyReading();
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-parchment-dark pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="tag-reading">Currently reading</span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-xs text-ink-faint hover:text-forest"
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
            className="font-mono text-xs text-ink-faint hover:text-oxblood"
          >
            cancel
          </button>
        </div>
      ) : current ? (
        <div className="flex items-center gap-3">
          <BookCover coverId={current.cover_id} title={current.title} size="M" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-ink">{current.title}</p>
            <p className="truncate text-sm text-ink-faint">
              {current.author ?? "Unknown author"}
            </p>
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="mt-1 font-mono text-xs text-ink-faint hover:text-oxblood"
            >
              {pending ? "…" : "clear"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-faint">
          You haven&rsquo;t set a book yet. Tap &ldquo;set&rdquo; to choose one.
        </p>
      )}
    </div>
  );
}
