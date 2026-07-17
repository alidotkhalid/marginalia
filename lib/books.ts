import { GENRES, genreLabel } from "@/lib/genres";

// Moods for the Books tab. Each maps to an Open Library subject term that
// approximates the feeling — a different lens than genre.
export const MOODS: { slug: string; label: string; subject: string }[] = [
  { slug: "cozy", label: "Cozy", subject: "cozy mystery" },
  { slug: "dark", label: "Dark", subject: "gothic" },
  { slug: "uplifting", label: "Uplifting", subject: "inspirational" },
  { slug: "adventurous", label: "Adventurous", subject: "adventure" },
  { slug: "funny", label: "Funny", subject: "humor" },
  { slug: "suspenseful", label: "Suspenseful", subject: "suspense" },
  { slug: "romantic", label: "Romantic", subject: "love stories" },
  { slug: "reflective", label: "Reflective", subject: "philosophy" },
];

const MOOD_BY_SLUG = new Map(MOODS.map((m) => [m.slug, m]));

export function isMood(slug: string): boolean {
  return MOOD_BY_SLUG.has(slug);
}

// The Open Library subject term to query for a given genre or mood slug.
export function subjectForGenre(slug: string): string {
  return (genreLabel(slug) ?? slug).toLowerCase();
}

export function subjectForMood(slug: string): string {
  return MOOD_BY_SLUG.get(slug)?.subject ?? slug;
}

export function moodLabel(slug: string): string {
  return MOOD_BY_SLUG.get(slug)?.label ?? slug;
}

export const GENRE_SLUGS = GENRES.map((g) => g.slug);
