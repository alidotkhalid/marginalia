-- ============================================================================
-- Migration: "Books Read" shelf + profile customization (accent color, banner)
-- Run ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Only adds columns/tables — changes no existing data.
-- ============================================================================

-- --- Profile customization -------------------------------------------------
alter table public.profiles
  add column if not exists accent_color text not null default '#b1934f'
    check (accent_color ~ '^#[0-9a-fA-F]{6}$');

alter table public.profiles
  add column if not exists banner_style text not null default 'gradient'
    check (banner_style in ('gradient', 'shelf', 'marble', 'plain'));

-- --- "Books Read" shelf -----------------------------------------------------
create table if not exists public.read_books (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  book_id      uuid not null references public.books (id) on delete cascade,
  finished_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists read_books_user_idx
  on public.read_books (user_id, finished_at desc);

alter table public.read_books enable row level security;

create policy "read shelves are viewable by everyone"
  on public.read_books for select using (true);

create policy "users add to their own shelf"
  on public.read_books for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users remove from their own shelf"
  on public.read_books for delete using (auth.uid() = user_id);
