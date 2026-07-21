"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { coverUrl, type BookResult } from "@/lib/openlibrary";
import { addReadBook, removeReadBook, setReadBookStatus } from "@/app/actions";
import { BookSearch } from "./BookSearch";

export type ReadBook = {
  book_id: string;
  title: string;
  author: string | null;
  cover_id: number | null;
};

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

// Four books on screen at a time, whatever the shelf holds. Each book takes a
// quarter of the track once the three gaps between them are accounted for.
const PER_PAGE = 4;
const GAP = 16; // px, matches gap-4
const BOOK_WIDTH = `calc((100% - ${(PER_PAGE - 1) * GAP}px) / ${PER_PAGE})`;

/**
 * A shelf of books. "finished" holds books read to the end (they land here
 * automatically at 100% progress); "to-read" is the pile of intentions. The
 * owner can add, pull, or move a book between the two.
 *
 * The shelf runs on one horizontal line however many books it holds, so a long
 * reading life never pushes the reads off the bottom of the page. Arrows appear
 * only when there is somewhere to go, and trackpads, touch and the keyboard all
 * scroll it natively.
 */
export function Shelf({
  books,
  isSelf,
  status = "finished",
}: {
  books: ReadBook[];
  isSelf: boolean;
  status?: "finished" | "to-read";
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const trackRef = useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // Which arrows to show, and whether the row overflows at all.
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, books.length]);

  // One click moves the shelf by exactly one set of four, so books never end up
  // half-shown at the edge.
  function page(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth + GAP), behavior: "smooth" });
  }

  function add(book: BookResult) {
    setAdding(false);
    startTransition(async () => {
      await addReadBook(book, status);
      router.refresh();
    });
  }

  function finish(bookId: string) {
    startTransition(async () => {
      await setReadBookStatus(bookId, "finished");
      router.refresh();
    });
  }

  function remove(bookId: string) {
    startTransition(async () => {
      await removeReadBook(bookId);
      router.refresh();
    });
  }

  const hasOverflow = !(atStart && atEnd);

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

      <div className="flex w-full min-w-0 max-w-full items-start gap-4 overflow-hidden">
        {/* Pinned outside the scroller, so adding a book is always one click
            away however long the shelf grows. */}
        {isSelf && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-44 w-[7rem] shrink-0 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-parchment-dark text-sm text-ink-faint transition-colors hover:border-brass hover:text-brass"
          >
            <span className="text-xl leading-none">+</span>
            Add book
          </button>
        )}

        <div className="relative min-w-0 flex-1">
          {/* Glass panes at the edges, shown only where there is more shelf */}
          {hasOverflow && !atStart && (
            <button
              type="button"
              onClick={() => page(-1)}
              aria-label="Scroll shelf left"
              className="shelf-arrow left-0"
            >
              ‹
            </button>
          )}
          {hasOverflow && !atEnd && (
            <button
              type="button"
              onClick={() => page(1)}
              aria-label="Scroll shelf right"
              className="shelf-arrow right-0"
            >
              ›
            </button>
          )}

        <ul
          ref={trackRef}
          onScroll={measure}
          tabIndex={0}
          className="shelf-track flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 focus:outline-none"
        >
          {books.map((b) => (
            <li
              key={b.book_id}
              style={{ width: BOOK_WIDTH }}
              className="group relative shrink-0 snap-start"
            >
              <div
                className="h-44 overflow-hidden rounded-card shadow-card ring-1 ring-black/30"
                title={b.author ? `${b.title}, ${b.author}` : b.title}
                style={b.cover_id ? undefined : { background: spineFor(b.title) }}
              >
                {b.cover_id ? (
                  /* Real cover art from Open Library. */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={coverUrl(b.cover_id, "L") ?? ""}
                    alt={`Cover of ${b.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* No cover on file: fall back to a typographic spine. */
                  <span className="flex h-full items-center justify-center p-3">
                    <span className="line-clamp-5 text-center font-display text-sm leading-snug text-cream">
                      {b.title}
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-center text-[11px] text-ink-faint">
                {b.title}
              </p>
              {isSelf && status === "to-read" && (
                <button
                  type="button"
                  onClick={() => finish(b.book_id)}
                  disabled={pending}
                  className="mx-auto mt-1 block font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-brass"
                >
                  finished it
                </button>
              )}
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

          </ul>
        </div>
      </div>

      {books.length === 0 && !isSelf && (
        <p className="text-sm text-ink-faint">
          {status === "to-read"
            ? "Nothing on the to-read pile yet."
            : "No finished books yet."}
        </p>
      )}
    </div>
  );
}
