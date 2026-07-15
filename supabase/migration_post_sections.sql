-- ============================================================================
-- Migration: a post can hold up to three text sections — note / quote / review.
-- Run ONCE in the Supabase SQL Editor BEFORE deploying this change.
-- Existing single-body posts are migrated into their matching section.
-- ============================================================================

alter table public.posts
  add column if not exists text_note text check (char_length(text_note) between 1 and 2000);
alter table public.posts
  add column if not exists text_quote text check (char_length(text_quote) between 1 and 2000);
alter table public.posts
  add column if not exists text_review text check (char_length(text_review) between 1 and 2000);

-- Move each existing post's single body into the section matching its kind.
update public.posts set text_note   = body where kind = 'note'   and text_note   is null and body is not null;
update public.posts set text_quote  = body where kind = 'quote'  and text_quote  is null and body is not null;
update public.posts set text_review = body where kind = 'review' and text_review is null and body is not null;

-- Posts may now be section-only, so `body` is no longer required.
alter table public.posts alter column body drop not null;

-- A post must still have at least one piece of text.
alter table public.posts drop constraint if exists posts_has_section;
alter table public.posts add constraint posts_has_section
  check (coalesce(text_note, text_quote, text_review, body) is not null);

-- Recreate the feed view to expose the three sections.
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
    p.text_review
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
