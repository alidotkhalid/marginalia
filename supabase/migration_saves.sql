-- ============================================================================
-- Migration: bookmark / save reads. Saves are private to each user.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.saves (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists saves_user_idx on public.saves (user_id, created_at desc);

alter table public.saves enable row level security;

-- Saves are private: only the owner can see (or change) their own.
create policy "owners see their saves"
  on public.saves for select using (auth.uid() = user_id);
create policy "owners save on their own behalf"
  on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "owners unsave on their own behalf"
  on public.saves for delete using (auth.uid() = user_id);

-- --- Recreate the feed view with saved_by_me --------------------------------
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
    prof.avatar_icon   as author_avatar_icon,
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
    ) as liked_by_me,
    exists (
      select 1 from public.saves sv
      where sv.post_id = p.id and sv.user_id = auth.uid()
    ) as saved_by_me
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
