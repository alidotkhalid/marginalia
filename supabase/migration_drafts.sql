-- ============================================================================
-- Migration: post drafts — save a post-in-progress to finish later.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.drafts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  text_note     text,
  text_quote    text,
  text_review   text,
  genre         text,
  book_olid     text,
  book_title    text,
  book_author   text,
  book_cover_id bigint,
  updated_at    timestamptz not null default now()
);

create index if not exists drafts_author_idx
  on public.drafts (author_id, updated_at desc);

alter table public.drafts enable row level security;

-- Drafts are entirely private to their owner.
create policy "owners read their drafts"
  on public.drafts for select using (auth.uid() = author_id);

create policy "owners create their drafts"
  on public.drafts for insert to authenticated with check (auth.uid() = author_id);

create policy "owners update their drafts"
  on public.drafts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "owners delete their drafts"
  on public.drafts for delete using (auth.uid() = author_id);
