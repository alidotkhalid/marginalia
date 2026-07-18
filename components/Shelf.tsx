"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { addReadBook, removeReadBook } from "@/app/actions";
import { BookSearch } from "./BookSearch";
import type { ReadBook } from "./ReadShelf";

// Muted spine colours, in the order they appear on a well-worn shelf.
const SPINES = [
  "#5c392e", // oxblood brown
  "#4a3763", // plum
  "#35523f", // forest
  "#6b3a3a", // brick
  "#35496b", // indigo
  "#5a4a2a", // ochre
];

// Same title always gets the same spine, so a shelf looks stable between visits.
function spineFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SPINES[h % SPINES.length];
}

/**
 * The shelf: finished books as stacked spines. Books land here automatically at
 * 100% progress, and the owner can add or pull one by hand.
 */
export function Shelf({
  books,
  isSelf,
}: {
  books: ReadBook[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function add(book: BookResult) {
    setAdding(false);
    startTransition(async () => {
      await addReadBook(book);
      router.refresh();
    });
  }

  function remove(bookId: string) {
    startTransition(async () => {
      await removeReadBook(bookId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {adding && (
        <div className="rounded-card border border-parchment-dark bg-parchment-light p-3">
          <BookSearch onSelect={add} />
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-2 font-mono text-xs text-ink-faint hover:text-ink"
          >
            cancel
          </button>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {books.map((b) => (
          <li key={b.book_id} className="group relative">
            <div
              className="flex h-44 items-center justify-center rounded-card p-3 shadow-card ring-1 ring-black/30"
              style={{ background: spineFor(b.title) }}
              title={b.author ? `${b.title} — ${b.author}` : b.title}
            >
              <span className="line-clamp-5 text-center font-display text-sm leading-snug text-cream">
                {b.title}
              </span>
            </div>
            {isSelf && (
              <button
                type="button"
                onClick={() => remove(b.book_id)}
                disabled={pending}
                aria-label={`Remove ${b.title}`}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-pill bg-oxblood text-[11px] text-cream group-hover:flex"
              >
                ×
              </button>
            )}
          </li>
        ))}

        {isSelf && !adding && (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-44 w-full items-center justify-center rounded-card border border-dashed border-parchment-dark text-sm text-ink-faint transition-colors hover:border-brass hover:text-brass"
            >
              + Add book
            </button>
          </li>
        )}
      </ul>

      {books.length === 0 && !isSelf && (
        <p className="text-sm text-ink-faint">No finished books yet.</p>
      )}
    </div>
  );
}
