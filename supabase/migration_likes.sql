-- ============================================================================
-- Migration: likes (hearts) on posts.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_post_idx on public.likes (post_id);

alter table public.likes enable row level security;

create policy "likes are viewable by everyone"
  on public.likes for select using (true);
create policy "users like on their own behalf"
  on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "users unlike on their own behalf"
  on public.likes for delete using (auth.uid() = user_id);

-- --- Recreate the feed view with like_count + liked_by_me --------------------
drop view if exists public.feed_posts;
create view public.feed_posts
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
    (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
    p.text_note,
    p.text_quote,
    p.text_review,
    p.answer_question,
    p.answer_asker,
    (select count(*) from public.likes lk where lk.post_id = p.id)::int as like_count,
    exists (
      select 1 from public.likes lk
      where lk.post_id = p.id and lk.user_id = auth.uid()
    ) as liked_by_me
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
