// Shared room vocabulary: the reading modes, and the genre of a room's books.
// Kept out of "use server" files so client components can import it too.

import { GENRES, genreLabel } from "./genres";

export type RoomMode = "quiet" | "sprints" | "open";

export const ROOM_MODES: { slug: RoomMode; label: string; blurb: string }[] = [
  { slug: "quiet", label: "Quiet", blurb: "No timer pressure, just company" },
  { slug: "sprints", label: "Sprints", blurb: "Short timed bursts together" },
  { slug: "open", label: "Open", blurb: "Come and go as you please" },
];

export function isRoomMode(v: string): v is RoomMode {
  return v === "quiet" || v === "sprints" || v === "open";
}

export function roomModeLabel(slug: string): string {
  return ROOM_MODES.find((m) => m.slug === slug)?.label ?? "Quiet";
}

/**
 * Room genres are the normal book genres plus "mixed", for rooms that read a
 * bit of everything.
 */
export const MIXED = "mixed";

export const ROOM_GENRES: { slug: string; label: string }[] = [
  { slug: MIXED, label: "Mixed genres" },
  ...GENRES,
];

export function isRoomGenre(slug: string): boolean {
  return slug === MIXED || GENRES.some((g) => g.slug === slug);
}

export function roomGenreLabel(slug: string): string {
  return slug === MIXED ? "Mixed" : genreLabel(slug) ?? slug;
}

// Broad buckets used by the filter pills, so readers can narrow without
// scrolling a list of twenty-odd genres.
const NONFICTION = new Set([
  "nonfiction",
  "biography",
  "memoir",
  "history",
  "science",
  "philosophy",
  "self-help",
  "essays",
]);

export function isNonfictionGenre(slug: string): boolean {
  return NONFICTION.has(slug);
}

export function isFictionGenre(slug: string): boolean {
  return slug !== MIXED && !NONFICTION.has(slug);
}
