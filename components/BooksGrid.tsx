"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { BookResult } from "@/lib/openlibrary";
import { fetchMoreBooks } from "@/app/actions";
import { BookTile } from "./BookTile";

// A cover-tile grid that keeps loading more books as you scroll (infinite
// scroll via IntersectionObserver + a paginated server action).
export function BooksGrid({
  initial,
  by,
  tag,
  author,
  canAct,
}: {
  initial: BookResult[];
  by: string;
  tag: string;
  author: string;
  canAct: boolean;
}) {
  const [books, setBooks] = useState<BookResult[]>(initial);
  const [done, setDone] = useState(initial.length === 0);
  const [pending, startTransition] = useTransition();

  const pageRef = useRef(1);
  const doneRef = useRef(initial.length === 0);
  const loadingRef = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Reset when the filter (props) changes on navigation.
  useEffect(() => {
    setBooks(initial);
    setDone(initial.length === 0);
    pageRef.current = 1;
    doneRef.current = initial.length === 0;
    loadingRef.current = false;
  }, [initial, by, tag, author]);

  const loadMore = useCallback(() => {
    if (doneRef.current || loadingRef.current) return;
    loadingRef.current = true;
    const next = pageRef.current + 1;
    startTransition(async () => {
      const more = await fetchMoreBooks({ by, tag, author, page: next });
      setBooks((prev) => {
        const seen = new Set(prev.map((b) => b.olid));
        return [...prev, ...more.filter((b) => !seen.has(b.olid))];
      });
      pageRef.current = next;
      if (more.length === 0) {
        doneRef.current = true;
        setDone(true);
      }
      loadingRef.current = false;
    });
  }, [by, tag, author]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "800px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
        {books.map((b) => (
          <BookTile key={b.olid} book={b} canAct={canAct} />
        ))}
      </div>

      <div ref={sentinel} className="py-6 text-center text-sm text-cream-soft">
        {pending
          ? "Finding more…"
          : done && books.length > 0
          ? "That's all we found."
          : ""}
      </div>
    </>
  );
}
