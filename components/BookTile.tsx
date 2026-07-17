"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { setCurrentlyReading, addReadBook } from "@/app/actions";
import { BookCover } from "./BookCover";

// A single book tile: cover, title, author, and (for signed-in readers) quick
// actions to start reading it or add it to their shelf.
export function BookTile({
  book,
  canAct,
}: {
  book: BookResult;
  canAct: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState<null | "reading" | "shelf">(null);
  const [pending, startTransition] = useTransition();

  function startReading() {
    startTransition(async () => {
      await setCurrentlyReading(book);
      setDone("reading");
      router.refresh();
    });
  }

  function addToShelf() {
    startTransition(async () => {
      await addReadBook(book);
      setDone("shelf");
    });
  }

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-card border border-parchment-dark bg-forest-deep">
        <div className="flex aspect-[2/3] items-center justify-center">
          <BookCover coverId={book.coverId} title={book.title} size="L" />
        </div>
        {canAct && (
          <div className="absolute inset-x-0 bottom-0 flex translate-y-full flex-col gap-1 bg-forest-deep/85 p-2 transition-transform group-hover:translate-y-0">
            <button
              onClick={startReading}
              disabled={pending}
              className="btn-accent !py-1 text-[11px]"
            >
              {done === "reading" ? "Reading ✓" : "Start reading"}
            </button>
            <button
              onClick={addToShelf}
              disabled={pending}
              className="btn-outline-cream !py-1 text-[11px]"
            >
              {done === "shelf" ? "On shelf ✓" : "Add to shelf"}
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium text-cream">{book.title}</p>
      <p className="line-clamp-1 text-[11px] text-cream-soft">
        {book.author ?? "Unknown author"}
      </p>
    </div>
  );
}
