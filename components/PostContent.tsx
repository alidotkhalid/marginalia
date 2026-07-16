"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updatePost, deletePost } from "@/app/actions";
import { postLimit } from "@/lib/constants";
import { GENRES } from "@/lib/genres";
import { PostBody } from "./PostBody";
import { Spinner } from "./Spinner";

// Renders a post's body + genre hashtag. For the post's author it also offers
// inline edit (of the three sections + genre) and delete.
export function PostContent({
  postId,
  note,
  quote,
  review,
  genre,
  isOwner,
}: {
  postId: string;
  note: string | null;
  quote: string | null;
  review: string | null;
  genre: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [n, setN] = useState(note ?? "");
  const [q, setQ] = useState(quote ?? "");
  const [r, setR] = useState(review ?? "");
  const [g, setG] = useState(genre ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updatePost(postId, { note: n, quote: q, review: r, genre: g });
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

  if (editing) {
    const fields: [string, string, (v: string) => void][] = [
      ["note", n, setN],
      ["quote", q, setQ],
      ["review", r, setR],
    ];
    return (
      <div className="space-y-2">
        {fields.map(([label, val, setter]) => (
          <div key={label}>
            <label className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              {label}{" "}
              <span className={val.length > postLimit(label) ? "text-oxblood" : ""}>
                ({val.length}/{postLimit(label)})
              </span>
            </label>
            <textarea
              value={val}
              onChange={(e) => setter(e.target.value)}
              maxLength={postLimit(label)}
              rows={label === "review" ? 5 : 2}
              placeholder={`${label}…`}
              className="input resize-none text-sm"
            />
          </div>
        ))}

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
            onClick={() => {
              setEditing(false);
              setN(note ?? "");
              setQ(quote ?? "");
              setR(review ?? "");
              setG(genre ?? "");
              setError(null);
            }}
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
