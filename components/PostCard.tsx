import Link from "next/link";
import { BookCover } from "./BookCover";
import { Avatar } from "./Avatar";
import { Comments } from "./Comments";
import { PostContent } from "./PostContent";

export type FeedPost = {
  id: string;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name: string | null;
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

// A single reading note, styled like an index card. Quotes get a left rule and
// italic treatment; the genre shows as a clickable hashtag; comments expand below.
export function PostCard({
  post,
  currentUserId,
}: {
  post: FeedPost;
  currentUserId?: string;
}) {
  return (
    <article className="card p-5">
      <header className="mb-3 flex items-center gap-3">
        <Link href={`/profile/${post.author_username}`}>
          <Avatar name={post.author_display_name ?? post.author_username} size={40} />
        </Link>
        <div className="flex-1">
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

      <PostContent
        postId={post.id}
        note={post.text_note}
        quote={post.text_quote}
        review={post.text_review}
        genre={post.genre}
        isOwner={!!currentUserId && currentUserId === post.author_id}
      />

      {post.book_title && (
        <div className="mt-3 flex items-center gap-3 border-t border-parchment-dark pt-3">
          <BookCover coverId={post.book_cover_id} title={post.book_title} size="S" />
          <div className="min-w-0 text-sm">
            <p className="truncate font-display text-ink-soft">{post.book_title}</p>
            <p className="truncate text-ink-faint">
              {post.book_author ?? "Unknown author"}
            </p>
          </div>
        </div>
      )}

      <Comments
        postId={post.id}
        count={post.comment_count ?? 0}
        currentUserId={currentUserId}
      />
    </article>
  );
}
