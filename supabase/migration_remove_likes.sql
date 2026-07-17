-- ============================================================================
-- Migration: remove likes; show a public bookmark (save) count on each read.
-- Saves stay private per-user (nobody sees WHO saved), but a SECURITY DEFINER
-- function exposes the total COUNT for display.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

-- The view references likes, so drop it first, then the likes table.
drop view if exists public.feed_posts;
drop table if exists public.likes cascade;

-- Total number of saves for a post (bypasses the owner-only saves RLS to count,
-- without exposing which users saved it).
create or replace function public.count_saves(pid uuid)
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from public.saves where post_id = pid;
$$;

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
    public.count_saves(p.id) as save_count,
    exists (
      select 1 from public.saves sv
      where sv.post_id = p.id and sv.user_id = auth.uid()
    ) as saved_by_me
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
