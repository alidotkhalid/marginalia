"use client";

import { useState, useTransition } from "react";
import type { BookResult } from "@/lib/openlibrary";
import { createPost } from "@/app/actions";
import { postLimit } from "@/lib/constants";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";
import { Spinner } from "./Spinner";

type Kind = "note" | "quote" | "review";

// The core writing surface: attach a book, pick a kind, write within a strict
// character budget. The counter turns oxblood as you approach the limit.
export function PostComposer() {
  const [book, setBook] = useState<BookResult | null>(null);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Kind>("note");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const limit = postLimit(kind);
  const remaining = limit - body.length;
  const nearLimit = remaining <= 40;
  const canSubmit = book !== null && body.trim().length > 0 && remaining >= 0;

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!book) {
      setError("Attach a book to your note.");
      return;
    }
    formData.set("book", JSON.stringify(book));
    formData.set("kind", kind);
    startTransition(async () => {
      const res = await createPost(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setBody("");
        setBook(null);
        setKind("note");
      }
    });
  }

  return (
    <form action={handleSubmit}>
      {/* Attached book, or the search box to pick one */}
      {book ? (
        <div className="mb-3 flex items-center gap-3 rounded-card border border-parchment-dark bg-parchment-light p-2">
          <BookCover coverId={book.coverId} title={book.title} size="S" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-semibold text-ink">
              {book.title}
            </p>
            <p className="truncate text-sm text-ink-faint">
              {book.author ?? "Unknown author"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBook(null)}
            className="text-xs font-mono text-ink-faint hover:text-oxblood"
          >
            change
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <BookSearch onSelect={setBook} />
        </div>
      )}

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={limit}
        rows={kind === "review" ? 6 : 3}
        placeholder={
          kind === "quote"
            ? "Transcribe a passage worth keeping…"
            : kind === "review"
            ? "A few honest lines on what you thought…"
            : "Share your latest read or thought…"
        }
        className="input resize-none leading-relaxed"
      />

      {/* Kind selector — note / quote / review */}
      <div className="mt-2 flex gap-1.5 font-mono text-[11px] uppercase tracking-wider">
        {(["note", "quote", "review"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-pill border px-2.5 py-0.5 transition-colors ${
              kind === k
                ? "border-forest bg-forest text-cream"
                : "border-parchment-dark text-ink-faint hover:bg-parchment-dark"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`font-mono text-xs ${
            nearLimit ? "text-oxblood" : "text-ink-faint"
          }`}
        >
          {remaining} left
        </span>
        <button type="submit" className="btn-accent" disabled={!canSubmit || pending}>
          {pending && <Spinner inline />}
          {pending ? "Posting…" : "Post"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
    </form>
  );
}
