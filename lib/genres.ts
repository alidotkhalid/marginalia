// The canonical book-genre list used by the composer dropdown and hashtag
// browsing. `slug` is stored on posts; `label` is what readers see.
export const GENRES: { slug: string; label: string }[] = [
  { slug: "fantasy", label: "Fantasy" },
  { slug: "science-fiction", label: "Science Fiction" },
  { slug: "mystery", label: "Mystery" },
  { slug: "thriller", label: "Thriller" },
  { slug: "romance", label: "Romance" },
  { slug: "historical-fiction", label: "Historical Fiction" },
  { slug: "literary-fiction", label: "Literary Fiction" },
  { slug: "horror", label: "Horror" },
  { slug: "nonfiction", label: "Nonfiction" },
  { slug: "biography", label: "Biography" },
  { slug: "memoir", label: "Memoir" },
  { slug: "poetry", label: "Poetry" },
  { slug: "young-adult", label: "Young Adult" },
  { slug: "childrens", label: "Children's" },
  { slug: "classics", label: "Classics" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "self-help", label: "Self-Help" },
  { slug: "history", label: "History" },
  { slug: "science", label: "Science" },
  { slug: "graphic-novel", label: "Graphic Novel" },
  { slug: "short-stories", label: "Short Stories" },
  { slug: "essays", label: "Essays" },
];

const BY_SLUG = new Map(GENRES.map((g) => [g.slug, g.label]));

export function isGenre(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function genreLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? slug;
}
