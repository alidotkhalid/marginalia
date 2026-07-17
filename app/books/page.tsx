import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { booksBySubject, booksByAuthor, type BookResult } from "@/lib/openlibrary";
import { BookTile } from "@/components/BookTile";
import { GENRES } from "@/lib/genres";
import {
  MOODS,
  isMood,
  subjectForGenre,
  subjectForMood,
  GENRE_SLUGS,
} from "@/lib/books";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: { by?: string; tag?: string; author?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const by =
    searchParams.by === "mood"
      ? "mood"
      : searchParams.by === "author"
      ? "author"
      : "genre";

  // Author mode is free-text search; genre/mood use chips.
  const authorQuery = (searchParams.author ?? "").trim().slice(0, 80);
  const options = by === "mood" ? MOODS : GENRES;

  const requested = searchParams.tag ?? "";
  const valid = by === "mood" ? isMood(requested) : GENRE_SLUGS.includes(requested);
  const activeTag = valid ? requested : options[0].slug;

  let books: BookResult[] = [];
  let activeLabel = "";
  if (by === "author") {
    books = authorQuery ? await booksByAuthor(authorQuery, 30) : [];
    activeLabel = authorQuery ? `Books by ${authorQuery}` : "";
  } else {
    const subject =
      by === "mood" ? subjectForMood(activeTag) : subjectForGenre(activeTag);
    books = await booksBySubject(subject, 30);
    activeLabel = options.find((o) => o.slug === activeTag)?.label ?? activeTag;
  }

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">Books</h1>
        <p className="text-sm text-cream-soft">
          Discover your next read — browse by genre or by mood.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Link
          href="/books?by=genre"
          className={`rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors ${
            by === "genre"
              ? "border-brass bg-brass/15 text-brass"
              : "border-parchment-dark text-cream-soft hover:border-brass"
          }`}
        >
          By genre
        </Link>
        <Link
          href="/books?by=mood"
          className={`rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors ${
            by === "mood"
              ? "border-brass bg-brass/15 text-brass"
              : "border-parchment-dark text-cream-soft hover:border-brass"
          }`}
        >
          By mood
        </Link>
        <Link
          href="/books?by=author"
          className={`rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors ${
            by === "author"
              ? "border-brass bg-brass/15 text-brass"
              : "border-parchment-dark text-cream-soft hover:border-brass"
          }`}
        >
          By author
        </Link>
      </div>

      {/* Options for the active filter */}
      {by === "author" ? (
        <form action="/books" method="get">
          <input type="hidden" name="by" value="author" />
          <input
            type="search"
            name="author"
            defaultValue={authorQuery}
            placeholder="Type an author's name…"
            className="input"
            aria-label="Author name"
          />
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Link
              key={o.slug}
              href={`/books?by=${by}&tag=${o.slug}`}
              className={`rounded-pill border px-3 py-1 font-mono text-xs transition-colors ${
                activeTag === o.slug
                  ? "border-brass bg-brass/15 text-brass"
                  : "border-parchment-dark text-cream-soft hover:border-brass hover:text-brass"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      )}

      {by === "author" && !authorQuery ? (
        <div className="card p-6 text-center text-ink-faint">
          Type an author&rsquo;s name above to see their books.
        </div>
      ) : (
        <>
          {activeLabel && <h2 className="section-title text-lg">{activeLabel}</h2>}
          {books.length === 0 ? (
            <div className="card p-6 text-center text-ink-faint">
              {by === "author"
                ? "No books found for that author. Try another spelling."
                : "Couldn't find books for this right now. Try another."}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
              {books.map((b) => (
                <BookTile key={b.olid} book={b} canAct={!!user} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
