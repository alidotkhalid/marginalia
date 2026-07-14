"use client";

import { useEffect, useRef, useState } from "react";
import type { BookResult } from "@/lib/openlibrary";
import { BookCover } from "./BookCover";

// Debounced search box that queries our /api/books proxy (Open Library) and
// calls `onSelect` with the chosen book. No manual image uploads anywhere.
export function BookSearch({
  onSelect,
}: {
  onSelect: (book: BookResult) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results: BookResult[] };
        setResults(data.results);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  return (
    <div className="relative">
      <input
        className="input font-mono text-sm"
        placeholder="Search a book by title or author…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-ink-faint">…</span>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto card p-1">
          {results.map((b) => (
            <li key={b.olid}>
              <button
                type="button"
                onClick={() => {
                  onSelect(b);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-start gap-3 rounded-[2px] p-2 text-left hover:bg-parchment-dark"
              >
                <BookCover coverId={b.coverId} title={b.title} size="S" />
                <span className="min-w-0">
                  <span className="block truncate font-display text-ink">
                    {b.title}
                  </span>
                  <span className="block truncate text-sm text-ink-faint">
                    {b.author ?? "Unknown author"}
                    {b.firstYear ? ` · ${b.firstYear}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
