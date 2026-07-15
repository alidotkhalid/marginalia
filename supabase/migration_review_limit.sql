-- ============================================================================
-- Migration: allow longer posts (reviews up to 2000 chars)
-- Run ONCE in the Supabase SQL Editor. Per-kind limits (note/quote 500,
-- review 2000) are enforced in the app; the DB just caps the absolute maximum.
-- ============================================================================

alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts
  add constraint posts_body_check
  check (char_length(body) between 1 and 2000);
