// Shared constants. Kept out of "use server" files (which may only export
// async functions) so both server actions and client components can import it.

export type PostKind = "note" | "quote" | "review";

// Per-kind character limits. Reviews get more room for thoughtful write-ups;
// notes and quotes stay short to encourage concision. Keep the max (2000) in
// sync with the DB check constraint in supabase/migration_review_limit.sql.
export const POST_LIMITS: Record<PostKind, number> = {
  note: 500,
  quote: 500,
  review: 2000,
};

// Absolute upper bound (matches the DB constraint).
export const POST_MAX_CHARS = 2000;

export function postLimit(kind: string): number {
  return POST_LIMITS[(kind as PostKind)] ?? 500;
}
