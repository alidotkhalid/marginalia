import Link from "next/link";
import { BookCover } from "./BookCover";

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
    <article className="card p-4">
      <header className="mb-2 flex items-baseline justify-between text-sm">
        <Link
          href={`/profile/${post.author_username}`}
          className="font-display text-ink no-underline hover:text-forest"
        >
          {post.author_display_name ?? `@${post.author_username}`}
        </Link>
        <time className="font-mono text-xs text-ink-faint" dateTime={post.created_at}>
          {timeAgo(post.created_at)}
        </time>
      </header>

      {post.kind === "quote" ? (
        <blockquote className="border-l-2 border-brass pl-3 font-serif text-lg italic leading-relaxed text-ink-soft">
          {post.body}
        </blockquote>
      ) : (
        <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink">
          {post.body}
        </p>
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
