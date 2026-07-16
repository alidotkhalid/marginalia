-- ============================================================================
-- Migration: let users pick a preset pixel-art avatar icon (null = identicon).
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

alter table public.profiles add column if not exists avatar_icon text;

-- Expose the author's chosen icon on the feed view so posts show it.
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
    ) as liked_by_me
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
