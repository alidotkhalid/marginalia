"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getComments,
  addComment,
  deleteComment,
  voteComment,
} from "@/app/actions";
import type { CommentRow } from "@/lib/comments";
import { Avatar } from "./Avatar";
import { ReportButton } from "./ReportButton";
import { Spinner } from "./Spinner";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// Turn "@username" into a profile link; mentioned readers get a notification.
function linkifyMentions(body: string) {
  const parts = body.split(/(@[a-zA-Z0-9_]{3,24})/g);
  if (parts.length === 1) return body;
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <Link
        key={i}
        href={`/profile/${part.slice(1).toLowerCase()}`}
        className="text-brass no-underline hover:text-brass-light"
      >
        {part}
      </Link>
    ) : (
      part
    )
  );
}

export function Comments({
  postId,
  count,
  currentUserId,
  isPostOwner = false,
  actions,
  initialOpen = false,
  highlightId = null,
}: {
  postId: string;
  count: number;
  currentUserId?: string;
  /** The signed-in reader wrote this read, so they can moderate its comments. */
  isPostOwner?: boolean;
  actions?: React.ReactNode;
  /** Open and load the thread immediately (permalinks from notifications). */
  initialOpen?: boolean;
  /** Comment to highlight and scroll to once loaded. */
  highlightId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const data = await getComments(postId);
    setComments(data);
    setLoading(false);
  }

  // Permalink arrival: fetch the thread without waiting for a click, then
  // bring the named comment into view.
  useEffect(() => {
    if (initialOpen && comments === null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!highlightId || comments === null) return;
    const el = document.getElementById(`comment-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments === null]);

  function toggle() {
    if (!open && comments === null) load();
    setOpen((o) => !o);
  }

  function submit() {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      await addComment(postId, text);
      setBody("");
      await load();
      router.refresh();
    });
  }

  function submitReply(parentId: string) {
    const text = replyText.trim();
    if (!text) return;
    startTransition(async () => {
      await addComment(postId, text, parentId);
      setReplyText("");
      setReplyingTo(null);
      await load();
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteComment(id);
      await load();
      router.refresh();
    });
  }

  function vote(commentId: string, dir: 1 | -1) {
    if (!currentUserId) return;
    const cur = comments?.find((c) => c.id === commentId);
    if (!cur) return;
    const newVote = cur.my_vote === dir ? 0 : dir;
    const delta = newVote - cur.my_vote;
    setComments(
      (prev) =>
        prev?.map((c) =>
          c.id === commentId ? { ...c, my_vote: newVote, score: c.score + delta } : c
        ) ?? null
    );
    startTransition(async () => {
      await voteComment(commentId, newVote);
    });
  }

  // Render one comment. Kept as a plain function (not a nested component) so
  // typing in a reply box doesn't lose focus on re-render.
  const renderComment = (c: CommentRow, isReply: boolean) => (
    <div
      id={`comment-${c.id}`}
      className={`flex gap-2 ${
        highlightId === c.id
          ? "rounded-card border border-brass/40 bg-brass/[0.08] p-2 -m-2"
          : ""
      }`}
    >
      <Link href={`/profile/${c.author?.username ?? ""}`}>
        <Avatar
          name={c.author?.display_name ?? c.author?.username ?? "?"}
          icon={c.author?.avatar_icon}
          size={isReply ? 24 : 28}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link
            href={`/profile/${c.author?.username ?? ""}`}
            className="font-semibold text-ink no-underline hover:text-brass"
          >
            {c.author?.display_name ?? c.author?.username ?? "Unknown"}
          </Link>{" "}
          <span className="font-mono text-xs text-ink-faint">
            {timeAgo(c.created_at)}
          </span>
        </p>
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {linkifyMentions(c.body)}
        </p>

        <div className="mt-1 flex items-center gap-3 text-sm">
          {/* Up / down vote */}
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => vote(c.id, 1)}
              disabled={!currentUserId}
              aria-label="Upvote"
              className={c.my_vote === 1 ? "text-brass" : "text-ink-faint hover:text-brass"}
            >
              ▲
            </button>
            <span
              className={`min-w-4 text-center font-mono text-xs ${
                c.score > 0 ? "text-brass" : c.score < 0 ? "text-oxblood" : "text-ink-faint"
              }`}
            >
              {c.score}
            </span>
            <button
              type="button"
              onClick={() => vote(c.id, -1)}
              disabled={!currentUserId}
              aria-label="Downvote"
              className={c.my_vote === -1 ? "text-oxblood" : "text-ink-faint hover:text-oxblood"}
            >
              ▼
            </button>
          </span>

          {/* Reply (one level only) */}
          {currentUserId && !isReply && (
            <button
              type="button"
              onClick={() => {
                setReplyingTo(replyingTo === c.id ? null : c.id);
                setReplyText("");
              }}
              className="font-mono text-xs text-ink-faint hover:text-brass"
            >
              reply
            </button>
          )}

          {/* Report, for comments that are not your own */}
          {currentUserId && currentUserId !== c.author_id && (
            <ReportButton kind="comment" id={c.id} compact />
          )}
        </div>

        {replyingTo === c.id && currentUserId && (
          <div className="mt-2 flex items-end gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              maxLength={500}
              rows={1}
              placeholder="Reply…"
              className="input resize-none !py-2 text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={() => submitReply(c.id)}
              disabled={pending || !replyText.trim()}
              className="btn-accent !py-2 text-sm"
            >
              {pending ? <Spinner inline /> : "Reply"}
            </button>
          </div>
        )}
      </div>

      {/* You can remove your own comments and replies; the author of the read
          can also clear anything left on it. */}
      {!!currentUserId && (currentUserId === c.author_id || isPostOwner) && (
        <button
          type="button"
          onClick={() => remove(c.id)}
          disabled={pending}
          aria-label={isReply ? "Delete reply" : "Delete comment"}
          title={isReply ? "Delete reply" : "Delete comment"}
          className="mt-0.5 shrink-0 self-start text-ink-faint hover:text-oxblood"
        >
          <svg
            width="13"
            height="14"
            viewBox="0 0 14 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 4h10" />
            <path d="M5.5 4V2.5h3V4" />
            <path d="M3.6 4l.5 9.2a1 1 0 0 0 1 .95h3.8a1 1 0 0 0 1-.95L10.4 4" />
            <path d="M6 6.7v5M8 6.7v5" />
          </svg>
        </button>
      )}
    </div>
  );

  const all = comments ?? [];
  const topLevel = all.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, CommentRow[]>();
  for (const c of all) {
    if (c.parent_id) {
      const arr = repliesByParent.get(c.parent_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_id, arr);
    }
  }
  const shown = comments?.length ?? count;

  return (
    <div className="mt-3 border-t border-parchment-dark pt-3">
      <div className="flex items-center gap-4">
        {actions}
        <button
          type="button"
          onClick={toggle}
          className="text-sm font-medium text-ink-faint hover:text-brass"
        >
          💬 {shown} {shown === 1 ? "comment" : "comments"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && <Spinner size={18} />}

          {topLevel.map((c) => (
            <div key={c.id} className="space-y-2">
              {renderComment(c, false)}
              {(repliesByParent.get(c.id) ?? []).length > 0 && (
                <div className="ml-8 space-y-2 border-l border-parchment-dark pl-3">
                  {(repliesByParent.get(c.id) ?? []).map((r) => (
                    <div key={r.id}>{renderComment(r, true)}</div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {currentUserId && (
            <div className="flex items-end gap-2 pt-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                rows={1}
                placeholder="Add a comment…"
                className="input resize-none !py-2 text-sm"
              />
              <button
                type="button"
                onClick={submit}
                disabled={pending || !body.trim()}
                className="btn-accent !py-2 text-sm"
              >
                {pending ? <Spinner inline /> : "Post"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
