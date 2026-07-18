import Link from "next/link";
import { BookCover } from "./BookCover";
import { Avatar } from "./Avatar";
import { Comments } from "./Comments";
import { PostContent } from "./PostContent";
import { StarRating } from "./StarRating";
import { FollowButton } from "./FollowButton";
import { SaveButton } from "./SaveButton";
import type { PostKind } from "@/lib/constants";
import type { FollowStatus } from "@/app/actions";

export type FeedPost = {
  id: string;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name: string | null;
  author_avatar_icon: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_id: number | null;
  kind: PostKind;
  rating: number | null;
  genre: string | null;
  comment_count: number;
  text_note: string | null;
  text_quote: string | null;
  text_review: string | null;
  answer_question: string | null;
  answer_asker: string | null;
  save_count: number;
  saved_by_me: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// How each kind introduces its book: "NOTE on 1984", "REVIEW of Piranesi".
const PREPOSITION: Record<PostKind, string> = {
  note: "on",
  quote: "from",
  review: "of",
};

/**
 * A single read. The type badge, book and time run along the top, the text
 * fills the body, and the book's cover sits on the right so the shelf stays
 * visible while you read.
 *
 * `compact` drops the author header, for lists that are already one author
 * deep (a profile page).
 */
export function PostCard({
  post,
  currentUserId,
  followStatus,
  compact = false,
}: {
  post: FeedPost;
  currentUserId?: string;
  followStatus?: FollowStatus;
  compact?: boolean;
}) {
  const isOwn = !!currentUserId && currentUserId === post.author_id;
  const showFollow =
    !compact && !!currentUserId && !isOwn && (followStatus ?? "none") !== "accepted";
  const kind: PostKind = post.kind ?? "note";

  return (
    <article className="card p-5">
      {!compact && (
        <header className="mb-3 flex items-center gap-3">
          <Link href={`/profile/${post.author_username}`}>
            <Avatar
              name={post.author_display_name ?? post.author_username}
              icon={post.author_avatar_icon}
              size={40}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${post.author_username}`}
              className="font-display font-semibold text-ink no-underline hover:text-brass"
            >
              {post.author_display_name ?? post.author_username}
            </Link>
            <p className="font-mono text-xs text-ink-faint">
              @{post.author_username}
            </p>
          </div>
          {showFollow && (
            <FollowButton
              targetId={post.author_id}
              initialStatus={followStatus ?? "none"}
            />
          )}
        </header>
      )}

      {post.answer_question && (
        <div className="mb-3 rounded-card border border-brass/30 bg-brass/5 p-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-brass">
            Ask
            {post.answer_asker && (
              <>
                {" · "}
                <Link href={`/profile/${post.answer_asker}`} className="link">
                  @{post.answer_asker}
                </Link>
              </>
            )}
          </p>
          <p className="mt-1 italic text-ink-soft">{post.answer_question}</p>
        </div>
      )}

      <div className="flex gap-4">
        {/* Text column */}
        <div className="min-w-0 flex-1">
          {/* Type badge · book · time · stars */}
          <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="kind-badge rounded-pill border border-brass/30 bg-brass/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass">
              {kind}
            </span>
            {post.book_title && (
              <span className="text-ink-faint">
                {PREPOSITION[kind]}{" "}
                <span className="font-semibold text-ink">{post.book_title}</span>
              </span>
            )}
            <span className="font-mono text-xs text-ink-faint">
              · {timeAgo(post.created_at)}
            </span>
            {kind === "review" && !!post.rating && (
              <StarRating value={post.rating} />
            )}
          </div>

          <PostContent
            postId={post.id}
            kind={kind}
            note={post.text_note}
            quote={post.text_quote}
            review={post.text_review}
            rating={post.rating}
            genre={post.genre}
            isOwner={isOwn}
          />
        </div>

        {/* Book cover, kept to the right of the read */}
        {post.book_title && (
          <div className="hidden w-16 shrink-0 sm:block">
            <BookCover
              coverId={post.book_cover_id}
              title={post.book_title}
              size="M"
            />
            <p className="mt-1 truncate text-center text-[10px] leading-tight text-ink-faint">
              {post.book_author ?? "Unknown"}
            </p>
          </div>
        )}
      </div>

      <Comments
        postId={post.id}
        count={post.comment_count ?? 0}
        currentUserId={currentUserId}
        actions={
          <SaveButton
            postId={post.id}
            initialSaved={!!post.saved_by_me}
            initialCount={post.save_count ?? 0}
            canSave={!!currentUserId}
          />
        }
      />
    </article>
  );
}
