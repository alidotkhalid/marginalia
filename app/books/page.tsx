import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { booksBySubject, booksByAuthor, type BookResult } from "@/lib/openlibrary";
import { BooksGrid } from "@/components/BooksGrid";
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
        <h1 className="font-display text-5xl font-bold text-cream">Books</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Discover your next read. Browse by genre or by mood.
        </p>
      </div>

      {/* Filter tabs: same pill language as the rest of the site */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["genre", "By genre"],
            ["mood", "By mood"],
            ["author", "By author"],
          ] as const
        ).map(([slug, label]) => (
          <Link
            key={slug}
            href={`/books?by=${slug}`}
            className={`profile-tab no-underline ${
              by === slug ? "profile-tab-active" : ""
            }`}
          >
            {label}
          </Link>
        ))}
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
            className="input py-3 sm:max-w-md"
            aria-label="Author name"
          />
        </form>
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          {options.map((o) => (
            <Link
              key={o.slug}
              href={`/books?by=${by}&tag=${o.slug}`}
              className={`rounded-pill border px-3 py-1 font-mono text-xs no-underline transition-colors ${
                activeTag === o.slug
                  ? "border-brass/40 bg-brass/15 text-brass"
                  : "border-parchment-dark text-ink-soft hover:border-brass/50 hover:text-ink"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      )}

      {by === "author" && !authorQuery ? (
        <div className="card p-8 text-center text-ink-faint">
          Type an author&rsquo;s name above to see their books.
        </div>
      ) : (
        <>
          {activeLabel && (
            <h2 className="font-display text-2xl font-semibold text-ink">
              {activeLabel}
            </h2>
          )}
          {books.length === 0 ? (
            <div className="card p-8 text-center text-ink-faint">
              {by === "author"
                ? "No books found for that author. Try another spelling."
                : "Couldn't find books for this right now. Try another."}
            </div>
          ) : (
            <BooksGrid
              initial={books}
              by={by}
              tag={activeTag}
              author={authorQuery}
              canAct={!!user}
            />
          )}
        </>
      )}
    </div>
  );
}
