import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/BookCover";
import { StarRating } from "@/components/StarRating";
import { BookShelfActions } from "@/components/BookShelfActions";
import { PostCard, type FeedPost } from "@/components/PostCard";
import type { BookResult } from "@/lib/openlibrary";
import type { FollowStatus } from "@/app/actions";

type BookRow = {
  id: string;
  olid: string;
  title: string;
  author: string | null;
  cover_id: number | null;
  first_year: number | null;
};

export async function generateMetadata({
  params,
}: {
  params: { olid: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, author")
    .eq("olid", params.olid)
    .maybeSingle();
  if (!book) return { title: "Book" };
  const title = book.author ? `${book.title} by ${book.author}` : book.title;
  return {
    title,
    description: `Notes, quotes and reviews of ${book.title} on Marginaly.`,
  };
}

// A book's own page: everything the site has written about it, in one place.
export default async function BookPage({
  params,
}: {
  params: { olid: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("books")
    .select("id, olid, title, author, cover_id, first_year")
    .eq("olid", params.olid)
    .maybeSingle();
  if (!data) notFound();
  const book = data as BookRow;

  const [
    { data: posts },
    { count: finished },
    { count: toRead },
    { count: readingNow },
    { data: follows },
  ] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("*")
      .eq("book_olid", book.olid)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("read_books")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id)
      .eq("status", "finished"),
    supabase
      .from("read_books")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id)
      .eq("status", "to-read"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("currently_reading", book.id),
    user
      ? supabase
          .from("follows")
          .select("following_id, status")
          .eq("follower_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const feed = (posts ?? []) as FeedPost[];
  const statusByUser = new Map<string, FollowStatus>();
  for (const f of (follows ?? []) as { following_id: string; status: string }[]) {
    statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
  }

  // The site's collective verdict: mean of every starred review.
  const ratings = feed
    .map((p) => p.rating)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  const reviews = feed.filter((p) => (p.kind ?? "note") === "review").length;
  const quotes = feed.filter((p) => (p.kind ?? "note") === "quote").length;
  const notes = feed.length - reviews - quotes;

  const asResult: BookResult = {
    olid: book.olid,
    title: book.title,
    author: book.author,
    coverId: book.cover_id,
    firstYear: book.first_year,
  };

  return (
    <div className="space-y-8">
      {/* ---- Book header ---- */}
      <header className="flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0">
          <BookCover coverId={book.cover_id} title={book.title} size="L" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-bold leading-tight text-cream sm:text-5xl">
            {book.title}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">
            {book.author ?? "Unknown author"}
            {book.first_year ? (
              <span className="ml-2 font-mono text-sm text-ink-faint">
                {book.first_year}
              </span>
            ) : null}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            {avgRating !== null && (
              <span className="flex items-center gap-2">
                <StarRating value={Math.round(avgRating)} />
                <span className="font-mono text-ink">
                  {avgRating}
                  <span className="text-ink-faint">
                    {" "}
                    · {ratings.length}{" "}
                    {ratings.length === 1 ? "rating" : "ratings"}
                  </span>
                </span>
              </span>
            )}
            <span className="font-mono text-xs text-ink-faint">
              {finished ?? 0} finished · {readingNow ?? 0} reading now ·{" "}
              {toRead ?? 0} want to read
            </span>
          </div>

          {user && (
            <div className="mt-5">
              <BookShelfActions book={asResult} />
            </div>
          )}
        </div>
      </header>

      {/* ---- Reads about this book ---- */}
      <section>
        <div className="mb-4 flex items-baseline justify-between border-b border-white/[0.06] pb-3">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Reads
          </h2>
          <p className="font-mono text-xs text-ink-faint">
            {reviews} reviews · {quotes} quotes · {notes} notes
          </p>
        </div>

        {feed.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-display text-lg text-ink-soft">
              Nothing written about this book yet.
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              Be the first: share a note, a quote, or a review from your feed.
            </p>
          </div>
        ) : (
          <div className="gap-5 space-y-5 lg:columns-2">
            {feed.map((post) => (
              <div key={post.id} className="break-inside-avoid">
                <PostCard
                  post={post}
                  currentUserId={user?.id}
                  followStatus={statusByUser.get(post.author_id) ?? "none"}
                  variant="feed"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
