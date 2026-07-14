// Shared constants. Kept out of "use server" files (which may only export
// async functions) so both server actions and client components can import it.

// Max characters for a post body. Keep in sync with the DB check constraint
// (char_length(body) between 1 and 500) in supabase/schema.sql.
export const POST_MAX_CHARS = 500;
