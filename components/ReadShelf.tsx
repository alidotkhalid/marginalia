"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { addReadBook, removeReadBook } from "@/app/actions";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";

export type ReadBook = {
  book_id: string;
  title: string;
  author: string | null;
  cover_id: number | null;
};

// The "Books Read" shelf: a growing grid of finished books. Books arrive here
// automatically when a reader hits 100% progress, or by manual add (own shelf).
export function ReadShelf({
  books,
  isSelf,
}: {
  books: ReadBook[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(book: BookResult) {
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
      {isSelf && (
        <div>
          <BookSearch onSelect={add} />
          <p className="mt-1 text-xs text-ink-faint">
            Add a book you&rsquo;ve finished, or reach 100% on your current read.
          </p>
        </div>
      )}

      {books.length === 0 ? (
        <p className="text-sm text-ink-faint">
          {isSelf
            ? "No finished books yet. Your shelf will fill up as you read."
            : "No finished books yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {books.map((b) => (
            <li key={b.book_id} className="group relative">
              <BookCover coverId={b.cover_id} title={b.title} size="M" />
              <span className="mt-1 block truncate text-[11px] leading-tight text-ink-soft">
                {b.title}
              </span>
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
      )}
    </div>
  );
}
