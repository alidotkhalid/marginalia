"use client";

import { useState, useTransition } from "react";
import type { BookResult } from "@/lib/openlibrary";
import { createPost, POST_MAX_CHARS } from "@/app/actions";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";

type Kind = "note" | "quote" | "review";

// The core writing surface: attach a book, pick a kind, write within a strict
// character budget. The counter turns oxblood as you approach the limit.
export function PostComposer() {
  const [book, setBook] = useState<BookResult | null>(null);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Kind>("note");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remaining = POST_MAX_CHARS - body.length;
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
    <form action={handleSubmit} className="card p-4">
      {/* Attached book, or the search box to pick one */}
      {book ? (
        <div className="mb-3 flex items-center gap-3">
          <BookCover coverId={book.coverId} title={book.title} size="S" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-ink">{book.title}</p>
            <p className="truncate text-sm text-ink-faint">
              {book.author ?? "Unknown author"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBook(null)}
            className="text-xs text-ink-faint hover:text-oxblood"
          >
            change
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <BookSearch onSelect={setBook} />
        </div>
      )}

      {/* Kind selector — note / quote / review */}
      <div className="mb-2 flex gap-1 font-mono text-xs uppercase tracking-wider">
        {(["note", "quote", "review"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-[2px] border px-2 py-0.5 ${
              kind === k
                ? "border-forest bg-forest text-parchment-light"
                : "border-parchment-dark text-ink-faint hover:bg-parchment-dark"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={POST_MAX_CHARS}
        rows={4}
        placeholder={
          kind === "quote"
            ? "Transcribe a passage worth keeping…"
            : kind === "review"
            ? "A few honest lines on what you thought…"
            : "What are you thinking about as you read?"
        }
        className="input resize-none font-serif text-lg leading-relaxed"
      />

      <div className="mt-2 flex items-center justify-between">
        <span
          className={`font-mono text-xs ${
            nearLimit ? "text-oxblood" : "text-ink-faint"
          }`}
        >
          {remaining} left
        </span>
        <button type="submit" className="btn-primary" disabled={!canSubmit || pending}>
          {pending ? "Posting…" : "Post note"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
    </form>
  );
}
