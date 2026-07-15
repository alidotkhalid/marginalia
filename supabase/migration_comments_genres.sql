-- ============================================================================
-- Migration: comments on posts + a genre tag per post
-- Run ONCE in the Supabase SQL Editor. Adds a column, a table + policies, and
-- extends the feed_posts view with genre + comment_count.
-- ============================================================================

-- --- Genre tag on posts (free text, restricted to the app's list) ----------
alter table public.posts add column if not exists genre text;

-- --- Comments ---------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists comments_post_idx
  on public.comments (post_id, created_at);

alter table public.comments enable row level security;

-- You can see a comment iff you can see its post. The subquery is filtered by
-- the posts RLS policy, so private/blocked posts' comments stay hidden.
drop policy if exists "comments visible with their post" on public.comments;
create policy "comments visible with their post"
  on public.comments for select using (
    exists (select 1 from public.posts p where p.id = comments.post_id)
  );

drop policy if exists "users comment on visible posts" on public.comments;
create policy "users comment on visible posts"
  on public.comments for insert to authenticated with check (
    auth.uid() = author_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

-- A comment can be removed by its author, or by the post's author (moderation).
drop policy if exists "authors delete own or on their post" on public.comments;
create policy "authors delete own or on their post"
  on public.comments for delete using (
    auth.uid() = author_id
    or exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.author_id = auth.uid()
    )
  );

-- --- Extend the feed view with genre + comment_count -----------------------
-- (CREATE OR REPLACE VIEW can only append columns, so these go at the end.)
create or replace view public.feed_posts
with (security_invoker = true) as
  select
    p.id,
    p.body,
    p.kind,
    p.created_at,
    p.author_id,
    prof.username      as author_username,
    prof.display_name  as author_display_name,
    b.olid             as book_olid,
    b.title            as book_title,
    b.author           as book_author,
    b.cover_id         as book_cover_id,
    p.genre,
    (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
