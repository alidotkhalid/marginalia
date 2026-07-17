import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { booksBySubject } from "@/lib/openlibrary";
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
  searchParams: { by?: string; tag?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const by = searchParams.by === "mood" ? "mood" : "genre";
  const options = by === "mood" ? MOODS : GENRES;

  const requested = searchParams.tag ?? "";
  const valid = by === "mood" ? isMood(requested) : GENRE_SLUGS.includes(requested);
  const activeTag = valid ? requested : options[0].slug;

  const subject =
    by === "mood" ? subjectForMood(activeTag) : subjectForGenre(activeTag);
  const books = await booksBySubject(subject, 30);

  const activeLabel =
    options.find((o) => o.slug === activeTag)?.label ?? activeTag;

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
      </div>

      {/* Options for the active filter */}
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

      <h2 className="section-title text-lg">{activeLabel}</h2>

      {books.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          Couldn&rsquo;t find books for this right now. Try another.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {books.map((b) => (
            <BookTile key={b.olid} book={b} canAct={!!user} />
          ))}
        </div>
      )}
    </div>
  );
}
