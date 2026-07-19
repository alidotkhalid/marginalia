-- ---------------------------------------------------------------------------
-- Performance views: push counting into Postgres instead of shipping rows.
--
-- 1. tag_counts    one row per tag with its read count (Discover + Tags)
-- 2. author_tags   distinct (author, tag) pairs (mutual shelves, tag readers)
-- 3. room_stats    per-room average session length + up to 4 book covers
--
-- All are security_invoker, so the caller's RLS still applies: reads from
-- private accounts you cannot see are not counted for you.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

create or replace view public.tag_counts
with (security_invoker = true) as
  select
    genre as tag,
    count(*)::int as posts,
    count(distinct author_id)::int as authors
  from public.posts
  where genre is not null
  group by genre;

create or replace view public.author_tags
with (security_invoker = true) as
  select distinct author_id, genre as tag
  from public.posts
  where genre is not null;

create or replace view public.room_stats
with (security_invoker = true) as
  select
    rp.room_id,
    -- Typical stay, in minutes, over sessions that lasted at least one.
    coalesce(
      round(
        avg(extract(epoch from (rp.last_seen - rp.joined_at)) / 60.0)
          filter (where rp.last_seen > rp.joined_at + interval '1 minute')
      )::int,
      0
    ) as avg_minutes,
    -- Up to four distinct books read here, for the cover stack.
    (
      array_agg(distinct jsonb_build_object('title', rp.book_title, 'cover', rp.book_cover_id))
        filter (where rp.book_title is not null)
    )[1:4] as books
  from public.room_participants rp
  group by rp.room_id;
