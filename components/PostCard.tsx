import Link from "next/link";
import { BookCover } from "./BookCover";
import { Avatar } from "./Avatar";
import { Comments } from "./Comments";
import { PostContent } from "./PostContent";
import { FollowButton } from "./FollowButton";
import { LikeButton } from "./LikeButton";
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
  genre: string | null;
  comment_count: number;
  text_note: string | null;
  text_quote: string | null;
  text_review: string | null;
  answer_question: string | null;
  answer_asker: string | null;
  like_count: number;
  liked_by_me: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A single reading note: book on top, then the text sections, with like/follow
// controls so readers can engage or follow the author directly from the post.
export function PostCard({
  post,
  currentUserId,
  followStatus,
}: {
  post: FeedPost;
  currentUserId?: string;
  followStatus?: FollowStatus;
}) {
  const isOwn = !!currentUserId && currentUserId === post.author_id;
  const showFollow =
    !!currentUserId && !isOwn && (followStatus ?? "none") !== "accepted";

  return (
    <article className="card p-5">
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
            @{post.author_username} · {timeAgo(post.created_at)}
          </p>
        </div>
        {showFollow && (
          <FollowButton
            targetId={post.author_id}
            initialStatus={followStatus ?? "none"}
          />
        )}
      </header>

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

      {/* Book on top */}
      {post.book_title && (
        <div className="mb-3 flex items-center gap-3 rounded-card border border-parchment-dark bg-parchment-light p-2">
          <BookCover coverId={post.book_cover_id} title={post.book_title} size="S" />
          <div className="min-w-0 text-sm">
            <p className="truncate font-display font-semibold text-ink-soft">
              {post.book_title}
            </p>
            <p className="truncate text-ink-faint">
              {post.book_author ?? "Unknown author"}
            </p>
          </div>
        </div>
      )}

      {/* Text sections at the bottom */}
      <PostContent
        postId={post.id}
        note={post.text_note}
        quote={post.text_quote}
        review={post.text_review}
        genre={post.genre}
        isOwner={isOwn}
      />

      <Comments
        postId={post.id}
        count={post.comment_count ?? 0}
        currentUserId={currentUserId}
        actions={
          <LikeButton
            postId={post.id}
            initialLiked={!!post.liked_by_me}
            initialCount={post.like_count ?? 0}
            canLike={!!currentUserId}
          />
        }
      />
    </article>
  );
}
