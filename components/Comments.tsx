"use client";

import { useState, useTransition } from "react";
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
import { Spinner } from "./Spinner";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function Comments({
  postId,
  count,
  currentUserId,
  actions,
}: {
  postId: string;
  count: number;
  currentUserId?: string;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    <div className="flex gap-2">
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
        <p className="whitespace-pre-wrap text-sm text-ink-soft">{c.body}</p>

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

      {currentUserId === c.author_id && (
        <button
          type="button"
          onClick={() => remove(c.id)}
          disabled={pending}
          className="text-xs text-ink-faint hover:text-oxblood"
          aria-label="Delete comment"
        >
          ×
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
