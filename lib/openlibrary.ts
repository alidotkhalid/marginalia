// ---------------------------------------------------------------------------
// Open Library API wrapper.
// Docs: https://openlibrary.org/dev/docs/api/search
// We only read public metadata and derive cover URLs. No API key required.
// ---------------------------------------------------------------------------

export type BookResult = {
  olid: string; // Open Library work key, e.g. "OL45804W"
  title: string;
  author: string | null;
  coverId: number | null;
  firstYear: number | null;
};

type RawDoc = {
  key: string; // "/works/OL45804W"
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
};

/**
 * Search Open Library by free-text query. Returns a small, normalized list.
 */
export async function searchBooks(
  query: string,
  limit = 8
): Promise<BookResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", String(limit));
  // Only request the fields we need — keeps the response tiny and fast.
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,first_publish_year"
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "Marginalia/1.0 (reading social app)" },
    // Cache identical searches for a minute at the edge.
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { docs?: RawDoc[] };
  return (data.docs ?? []).map((doc) => ({
    olid: doc.key.replace("/works/", ""),
    title: doc.title,
    author: doc.author_name?.[0] ?? null,
    coverId: doc.cover_i ?? null,
    firstYear: doc.first_publish_year ?? null,
  }));
}

/**
 * Fetch books for a subject term (used by the Books tab's genre/mood browsing).
 * Only returns books that have a cover, so the tile grid looks good.
 */
export async function booksBySubject(
  subject: string,
  limit = 30
): Promise<BookResult[]> {
  const term = subject.trim();
  if (!term) return [];

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("subject", term);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,first_publish_year"
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "Marginalia/1.0 (reading social app)" },
    // Subject lists change slowly; cache for an hour at the edge.
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { docs?: RawDoc[] };
  return (data.docs ?? [])
    .filter((doc) => doc.cover_i)
    .map((doc) => ({
      olid: doc.key.replace("/works/", ""),
      title: doc.title,
      author: doc.author_name?.[0] ?? null,
      coverId: doc.cover_i ?? null,
      firstYear: doc.first_publish_year ?? null,
    }));
}

/**
 * Build a cover-art URL from an Open Library cover id.
 * size: S | M | L. Returns null if there is no cover.
 */
export function coverUrl(
  coverId: number | null | undefined,
  size: "S" | "M" | "L" = "M"
): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}
