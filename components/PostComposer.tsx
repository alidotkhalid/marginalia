"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { createPost, saveDraft, deleteDraft } from "@/app/actions";
import { postLimit } from "@/lib/constants";
import { GENRES } from "@/lib/genres";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";
import { Avatar } from "./Avatar";
import { StarRating } from "./StarRating";
import { Spinner } from "./Spinner";

type Kind = "note" | "quote" | "review";

export type DraftInit = {
  id: string;
  note: string;
  quote: string;
  review: string;
  genre: string;
  book: BookResult | null;
};

const KINDS: { key: Kind; label: string; blurb: string }[] = [
  { key: "note", label: "Note", blurb: "A thought while reading" },
  { key: "quote", label: "Quote", blurb: "A passage worth keeping" },
  { key: "review", label: "Review", blurb: "What you made of it" },
];

// The core writing surface. A read is one thing: a note, a quote, or a review.
// The reader picks which up front, attaches a book, and writes within a strict
// character budget. Reviews can carry a star rating.
//
// "panel" is the stacked layout used in the profile sidebar. "compact" is the
// single-line bar on the home page: avatar, one input, then controls beneath.
export function PostComposer({
  initialDraft,
  variant = "panel",
  authorName,
  authorIcon,
}: {
  initialDraft?: DraftInit;
  variant?: "panel" | "compact";
  authorName?: string;
  authorIcon?: string | null;
}) {
  const router = useRouter();
  const compact = variant === "compact";

  // A draft was written as one of the three kinds; reopen it as that kind.
  const draftKind: Kind = initialDraft?.quote?.trim()
    ? "quote"
    : initialDraft?.review?.trim()
    ? "review"
    : "note";

  const [book, setBook] = useState<BookResult | null>(initialDraft?.book ?? null);
  const [kind, setKind] = useState<Kind>(draftKind);
  const [text, setText] = useState(
    initialDraft
      ? initialDraft[draftKind] ?? ""
      : ""
  );
  const [rating, setRating] = useState(0);
  const [genre, setGenre] = useState(initialDraft?.genre ?? "");
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"post" | "draft" | "delete" | null>(null);
  const [confirmDelDraft, setConfirmDelDraft] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const limit = postLimit(kind);
  const remaining = limit - text.length;
  const nearLimit = remaining <= 40;
  const canSubmit = book !== null && text.trim().length > 0 && text.length <= limit;

  function reset() {
    setText("");
    setBook(null);
    setKind("note");
    setRating(0);
    setGenre("");
    setDraftId(null);
    setDraftMsg(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!book) {
      setError("Attach a book to your read.");
      return;
    }
    formData.set("book", JSON.stringify(book));
    formData.set("kind", kind);
    formData.set("text", text);
    formData.set("genre", genre);
    formData.set("rating", kind === "review" && rating > 0 ? String(rating) : "");
    setBusy("post");
    startTransition(async () => {
      const res = await createPost(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        if (draftId) await deleteDraft(draftId);
        reset();
      }
      setBusy(null);
    });
  }

  function saveCurrentDraft() {
    setError(null);
    setDraftMsg(null);
    setBusy("draft");
    startTransition(async () => {
      const res = await saveDraft({
        id: draftId ?? undefined,
        note: kind === "note" ? text : "",
        quote: kind === "quote" ? text : "",
        review: kind === "review" ? text : "",
        genre,
        book,
      });
      if (res.error) setError(res.error);
      else {
        setDraftId(res.id);
        setDraftMsg("Draft saved");
      }
      setBusy(null);
    });
  }

  function deleteCurrentDraft() {
    setError(null);
    setBusy("delete");
    startTransition(async () => {
      if (draftId) await deleteDraft(draftId);
      reset();
      setConfirmDelDraft(false);
      setBusy(null);
      router.replace("/");
    });
  }

  if (compact) {
    return (
      <form action={handleSubmit}>
        {/* One line: who is writing, and the read itself */}
        <div className="flex items-start gap-3">
          {authorName && (
            <Avatar name={authorName} icon={authorIcon ?? null} size={40} />
          )}
          <textarea
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={limit}
            rows={text.length > 90 ? 3 : 1}
            placeholder="Share your latest read or thought…"
            className="mt-1.5 w-full resize-none border-0 bg-transparent p-0 text-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0"
          />
        </div>

        {/* Attached book, or the search box when "+ Book" is open */}
        {book ? (
          <div className="mt-3 flex items-center gap-3 rounded-card border border-parchment-dark bg-parchment-light p-2">
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
              className="font-mono text-xs text-ink-faint hover:text-oxblood"
            >
              remove
            </button>
          </div>
        ) : (
          bookOpen && (
            <div className="mt-3">
              <BookSearch
                onSelect={(b) => {
                  setBook(b);
                  setBookOpen(false);
                }}
              />
            </div>
          )
        )}

        {kind === "review" && (
          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              Rating
            </span>
            <StarRating value={rating} onChange={setRating} size="md" />
          </div>
        )}

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              title={k.blurb}
              className={`rounded-pill border px-4 py-1.5 text-sm transition-colors ${
                kind === k.key
                  ? "border-brass/40 bg-brass/15 font-medium text-brass"
                  : "border-parchment-dark text-ink-soft hover:text-ink"
              }`}
            >
              {k.label}
            </button>
          ))}

          {!book && (
            <button
              type="button"
              onClick={() => setBookOpen((v) => !v)}
              className="px-2 text-sm text-ink-faint transition-colors hover:text-brass"
            >
              + Book
            </button>
          )}

          <span className="relative ml-1 inline-flex items-center">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="appearance-none rounded-pill border border-parchment-dark bg-transparent py-1 pl-3 pr-7 font-mono text-[11px] uppercase tracking-wider text-ink-faint focus:border-brass focus:outline-none"
              aria-label="Genre"
            >
              <option value="">+ genre</option>
              {GENRES.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 text-[9px] text-ink-faint">
              ▼
            </span>
          </span>

          <div className="ml-auto flex items-center gap-3">
            {text.length > 0 && (
              <span
                className={`font-mono text-xs ${
                  nearLimit ? "text-oxblood" : "text-ink-faint"
                }`}
              >
                {remaining}
              </span>
            )}
            {draftMsg && (
              <span className="font-mono text-xs text-brass">{draftMsg}</span>
            )}
            <button
              type="button"
              onClick={saveCurrentDraft}
              disabled={pending || (!text.trim() && !book)}
              className="font-mono text-xs text-ink-faint hover:text-brass disabled:opacity-40"
            >
              {busy === "draft" ? "Saving…" : "Save draft"}
            </button>
            <button
              type="submit"
              className="btn-accent !px-6"
              disabled={!canSubmit || pending}
            >
              {busy === "post" && <Spinner inline />}
              {busy === "post" ? "Posting…" : "Post"}
            </button>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
      </form>
    );
  }

  return (
    <form action={handleSubmit}>
      {/* Step 1: what kind of read is this? */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            title={k.blurb}
            className={`rounded-card border px-2 py-2 text-center transition-colors ${
              kind === k.key
                ? "border-brass bg-brass/15 text-brass"
                : "border-parchment-dark text-ink-faint hover:border-brass/50 hover:text-ink"
            }`}
          >
            <span className="block font-mono text-[11px] uppercase tracking-wider">
              {k.label}
            </span>
          </button>
        ))}
      </div>

      {/* Step 2: attach a book */}
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

      {/* Step 3: write it */}
      <textarea
        name="body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={limit}
        rows={kind === "review" ? 6 : 3}
        placeholder={
          kind === "quote"
            ? "Transcribe a passage worth keeping…"
            : kind === "review"
            ? "A few honest lines on what you thought…"
            : "A thought from today's reading…"
        }
        className="input resize-none leading-relaxed"
      />

      {/* Reviews carry a star rating */}
      {kind === "review" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            Rating
          </span>
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>
      )}

      {/* Genre dropdown: becomes a clickable hashtag on the read */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="relative inline-flex items-center">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="appearance-none rounded-pill border border-parchment-dark bg-parchment-light py-1 pl-3 pr-7 font-mono text-[11px] uppercase tracking-wider text-ink focus:border-brass focus:outline-none"
            aria-label="Genre"
          >
            <option value="">+ genre</option>
            {GENRES.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[9px] text-ink-faint">
            ▼
          </span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`font-mono text-xs ${
            nearLimit ? "text-oxblood" : "text-ink-faint"
          }`}
        >
          {remaining} left
        </span>
        <div className="flex items-center gap-2">
          {draftMsg && (
            <span className="font-mono text-xs text-brass">{draftMsg}</span>
          )}
          {draftId &&
            (confirmDelDraft ? (
              <span className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={deleteCurrentDraft}
                  disabled={pending}
                  className="text-oxblood hover:text-oxblood-light"
                >
                  {busy === "delete" ? "deleting…" : "confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelDraft(false)}
                  className="text-ink-faint hover:text-ink"
                >
                  cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelDraft(true)}
                className="font-mono text-xs text-ink-faint hover:text-oxblood"
              >
                Delete draft
              </button>
            ))}
          <button
            type="button"
            onClick={saveCurrentDraft}
            disabled={pending || (!text.trim() && !book)}
            className="btn-ghost !py-2 text-sm"
          >
            {busy === "draft" && <Spinner inline />}
            {busy === "draft" ? "Saving…" : "Save draft"}
          </button>
          <button type="submit" className="btn-accent" disabled={!canSubmit || pending}>
            {busy === "post" && <Spinner inline />}
            {busy === "post" ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
    </form>
  );
}
