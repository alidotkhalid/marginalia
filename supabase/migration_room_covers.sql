-- ============================================================================
-- Migration: store each room participant's book cover (from Open Library) so
-- rooms can show covers, not just titles.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

alter table public.room_participants
  add column if not exists book_cover_id bigint;
