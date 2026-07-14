"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { setCurrentlyReading } from "@/app/actions";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";

// "Search a book or author" widget. Looks up any title via Open Library and
// shows it. On your own profile you can set the result as Currently Reading.
export function BookLookup({ canSetReading = false }: { canSetReading?: boolean }) {
  const router = useRouter();
  const [picked, setPicked] = useState<BookResult | null>(null);
  const [pending, startTransition] = useTransition();

  function setReading() {
    if (!picked) return;
    startTransition(async () => {
      await setCurrentlyReading(picked);
      setPicked(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <BookSearch onSelect={setPicked} />

      {picked && (
        <div className="flex gap-3 rounded-card border border-parchment-dark bg-parchment-light p-3">
          <BookCover coverId={picked.coverId} title={picked.title} size="M" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-ink">
              {picked.title}
            </p>
            <p className="truncate text-sm text-ink-faint">
              {picked.author ?? "Unknown author"}
              {picked.firstYear ? ` · ${picked.firstYear}` : ""}
            </p>
            {canSetReading && (
              <button
                type="button"
                onClick={setReading}
                disabled={pending}
                className="btn-accent mt-2 !px-3 !py-1 text-xs"
              >
                {pending ? "Setting…" : "Set as currently reading"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
