import Link from "next/link";
import { BookCover } from "./BookCover";
import { Avatar } from "./Avatar";

export type FeedPost = {
  id: string;
  body: string;
  kind: "note" | "quote" | "review";
  created_at: string;
  author_username: string;
  author_display_name: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_id: number | null;
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

// A single reading note, styled like an index card. Quotes get a left rule
// and italic treatment; reviews/notes read as plain body copy.
export function PostCard({ post }: { post: FeedPost }) {
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
        {post.kind !== "note" && (
          <span className="rounded-pill border border-brass/40 bg-brass/10 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-brass-dark">
            {post.kind}
          </span>
        )}
      </header>

      {post.kind === "quote" ? (
        <blockquote className="border-l-2 border-brass pl-3 font-display text-lg italic leading-relaxed text-ink-soft">
          {post.body}
        </blockquote>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-ink">{post.body}</p>
      )}

      {post.book_title && (
        <footer className="mt-3 flex items-center gap-3 border-t border-parchment-dark pt-3">
          <BookCover
            coverId={post.book_cover_id}
            title={post.book_title}
            size="S"
          />
          <div className="min-w-0 text-sm">
            <p className="truncate font-display text-ink-soft">{post.book_title}</p>
            <p className="truncate text-ink-faint">
              {post.book_author ?? "Unknown author"}
            </p>
          </div>
        </footer>
      )}
    </article>
  );
}
