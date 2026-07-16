-- ============================================================================
-- Migration: replies to comments.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

-- A comment may be a reply to another comment (self-referential, one level).
alter table public.comments
  add column if not exists parent_id uuid references public.comments (id) on delete cascade;

create index if not exists comments_parent_idx on public.comments (parent_id);
