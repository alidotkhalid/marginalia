"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updatePost, deletePost } from "@/app/actions";
import { postLimit, type PostKind } from "@/lib/constants";
import { GENRES } from "@/lib/genres";
import { PostBody } from "./PostBody";
import { StarRating } from "./StarRating";
import { Spinner } from "./Spinner";

const KINDS: PostKind[] = ["note", "quote", "review"];

// Renders a read's body + genre hashtag. For the author it also offers inline
// edit (kind, text, rating, genre) and delete.
export function PostContent({
  postId,
  kind,
  note,
  quote,
  review,
  rating,
  genre,
  isOwner,
}: {
  postId: string;
  kind: PostKind;
  note: string | null;
  quote: string | null;
  review: string | null;
  rating: number | null;
  genre: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Older reads may hold more than one section; edit whichever matches the kind,
  // falling back to the first section that has text.
  const initialText =
    (kind === "note" ? note : kind === "quote" ? quote : review) ??
    note ??
    quote ??
    review ??
    "";

  const [k, setK] = useState<PostKind>(kind);
  const [text, setText] = useState(initialText);
  const [stars, setStars] = useState(rating ?? 0);
  const [g, setG] = useState(genre ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updatePost(postId, {
        kind: k,
        text,
        genre: g,
        rating: k === "review" ? stars : 0,
      });
      if (res?.error) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function del() {
    startTransition(async () => {
      await deletePost(postId);
      router.refresh();
    });
  }

  function cancel() {
    setEditing(false);
    setK(kind);
    setText(initialText);
    setStars(rating ?? 0);
    setG(genre ?? "");
    setError(null);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-wider">
          {KINDS.map((kind_) => (
            <button
              key={kind_}
              type="button"
              onClick={() => setK(kind_)}
              className={`rounded-pill border px-2.5 py-0.5 transition-colors ${
                k === kind_
                  ? "border-brass bg-brass/15 text-brass"
                  : "border-parchment-dark text-ink-faint hover:text-brass"
              }`}
            >
              {kind_}
            </button>
          ))}
          <span
            className={`ml-auto ${
              text.length > postLimit(k) ? "text-oxblood" : "text-ink-faint"
            }`}
          >
            {text.length}/{postLimit(k)}
          </span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={postLimit(k)}
          rows={k === "review" ? 5 : 3}
          placeholder={`${k}…`}
          className="input resize-none text-sm"
        />

        {k === "review" && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              Rating
            </span>
            <StarRating value={stars} onChange={setStars} />
          </div>
        )}

        <span className="relative inline-flex items-center">
          <select
            value={g}
            onChange={(e) => setG(e.target.value)}
            className="appearance-none rounded-pill border border-parchment-dark bg-parchment-light py-1 pl-3 pr-7 font-mono text-[11px] uppercase tracking-wider text-ink focus:border-brass focus:outline-none"
          >
            <option value="">+ genre</option>
            {GENRES.map((genreItem) => (
              <option key={genreItem.slug} value={genreItem.slug}>
                {genreItem.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[9px] text-ink-faint">
            ▼
          </span>
        </span>

        {error && <p className="text-sm text-oxblood">{error}</p>}

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={pending} className="btn-accent !py-1.5 text-sm">
            {pending && <Spinner inline />}
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancel}
            className="text-xs font-mono text-ink-faint hover:text-oxblood"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PostBody note={note} quote={quote} review={review} />

      {genre && (
        <Link
          href={`/discover?genre=${genre}`}
          className="mt-2 inline-block font-mono text-sm text-brass hover:text-brass-light"
        >
          #{genre}
        </Link>
      )}

      {isOwner && (
        <div className="mt-2 flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setEditing(true)}
            className="text-ink-faint hover:text-brass"
          >
            edit
          </button>
          {confirmDel ? (
            <>
              <button
                onClick={del}
                disabled={pending}
                className="text-oxblood hover:text-oxblood-light"
              >
                confirm delete
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-ink-faint hover:text-ink"
              >
                cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="text-ink-faint hover:text-oxblood"
            >
              delete
            </button>
          )}
        </div>
      )}
    </>
  );
}
