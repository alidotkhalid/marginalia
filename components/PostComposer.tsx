"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { createPost, saveDraft, deleteDraft } from "@/app/actions";
import { postLimit } from "@/lib/constants";
import { GENRES } from "@/lib/genres";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";
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

// The core writing surface: attach a book, pick a kind, write within a strict
// character budget. Can be loaded from — and saved back to — a draft.
export function PostComposer({ initialDraft }: { initialDraft?: DraftInit }) {
  const router = useRouter();
  const [book, setBook] = useState<BookResult | null>(initialDraft?.book ?? null);
  // Each kind keeps its own draft text, so switching tabs never overwrites what
  // you wrote for another kind.
  const [bodies, setBodies] = useState<Record<Kind, string>>({
    note: initialDraft?.note ?? "",
    quote: initialDraft?.quote ?? "",
    review: initialDraft?.review ?? "",
  });
  const [kind, setKind] = useState<Kind>("note");
  const [genre, setGenre] = useState(initialDraft?.genre ?? "");
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"post" | "draft" | "delete" | null>(null);
  const [confirmDelDraft, setConfirmDelDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const body = bodies[kind];
  const setBody = (val: string) =>
    setBodies((prev) => ({ ...prev, [kind]: val }));

  const limit = postLimit(kind);
  const remaining = limit - body.length;
  const nearLimit = remaining <= 40;

  const anyText = !!(
    bodies.note.trim() ||
    bodies.quote.trim() ||
    bodies.review.trim()
  );
  const withinLimits =
    bodies.note.length <= postLimit("note") &&
    bodies.quote.length <= postLimit("quote") &&
    bodies.review.length <= postLimit("review");
  const canSubmit = book !== null && anyText && withinLimits;

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!book) {
      setError("Attach a book to your post.");
      return;
    }
    formData.set("book", JSON.stringify(book));
    formData.set("text_note", bodies.note);
    formData.set("text_quote", bodies.quote);
    formData.set("text_review", bodies.review);
    formData.set("genre", genre);
    setBusy("post");
    startTransition(async () => {
      const res = await createPost(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        if (draftId) await deleteDraft(draftId);
        setBodies({ note: "", quote: "", review: "" });
        setBook(null);
        setKind("note");
        setGenre("");
        setDraftId(null);
        setDraftMsg(null);
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
        note: bodies.note,
        quote: bodies.quote,
        review: bodies.review,
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
      setBodies({ note: "", quote: "", review: "" });
      setBook(null);
      setKind("note");
      setGenre("");
      setDraftId(null);
      setDraftMsg(null);
      setConfirmDelDraft(false);
      setBusy(null);
      router.replace("/");
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
      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
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
            {bodies[k].trim() && <span className="ml-1 text-brass">•</span>}
          </button>
        ))}

        {/* Genre dropdown — becomes a clickable hashtag on the post */}
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="ml-auto rounded-pill border border-parchment-dark bg-parchment-light px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink focus:border-brass focus:outline-none"
          aria-label="Genre"
        >
          <option value="">＋ genre</option>
          {GENRES.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.label}
            </option>
          ))}
        </select>
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
            disabled={pending || (!anyText && !book)}
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
