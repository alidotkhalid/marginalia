-- ---------------------------------------------------------------------------
-- Profile redesign: review ratings + reading streaks.
--
-- 1. posts.rating       star rating (1 to 5) shown on reviews
-- 2. activity_days      one row per user per day they did something bookish
-- 3. reading_streak()   current + best streak, computed from activity_days
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. Review star rating -------------------------------------------------------

alter table public.posts
  add column if not exists rating smallint
    check (rating is null or rating between 1 and 5);

-- 2. Activity days ------------------------------------------------------------
-- A day counts if the reader posted a read, logged reading progress, or sat in
-- a reading room. We store the day only, so a busy day still counts once.

create table if not exists public.activity_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  primary key (user_id, day)
);

alter table public.activity_days enable row level security;

drop policy if exists "activity readable by owner and followers" on public.activity_days;
create policy "activity readable by owner and followers"
  on public.activity_days for select
  using (
    user_id = auth.uid()
    or public.is_profile_public(user_id)
    or public.is_accepted_follower(user_id, auth.uid())
  );

-- Rows are only ever written by the triggers below (they run as the definer),
-- so no insert/update policy is granted to clients.

-- Helper the triggers call: record "this user was active today".
create or replace function public.mark_active(uid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_days (user_id, day)
  values (uid, (now() at time zone 'utc')::date)
  on conflict (user_id, day) do nothing;
$$;

-- Posting a read counts.
create or replace function public.handle_activity_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_active(new.author_id);
  return new;
end;
$$;

drop trigger if exists on_post_activity on public.posts;
create trigger on_post_activity
  after insert on public.posts
  for each row execute function public.handle_activity_post();

-- Logging reading progress counts.
create or replace function public.handle_activity_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reading_progress is distinct from old.reading_progress
     or new.currently_reading is distinct from old.currently_reading then
    perform public.mark_active(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_progress_activity on public.profiles;
create trigger on_progress_activity
  after update on public.profiles
  for each row execute function public.handle_activity_progress();

-- Joining a reading room counts.
create or replace function public.handle_activity_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_active(new.user_id);
  return new;
end;
$$;

drop trigger if exists on_room_activity on public.room_participants;
create trigger on_room_activity
  after insert on public.room_participants
  for each row execute function public.handle_activity_room();

-- Finishing a book counts too.
drop trigger if exists on_read_book_activity on public.read_books;
create trigger on_read_book_activity
  after insert on public.read_books
  for each row execute function public.handle_activity_room();

-- 3. Streak calculation -------------------------------------------------------
-- Current streak: consecutive days ending today (or yesterday, so the streak
-- survives until the day is over). Best streak: longest run ever recorded.

create or replace function public.reading_streak(uid uuid)
returns table (current_days int, best_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'utc')::date;
begin
  return query
  with days as (
    select day from public.activity_days where user_id = uid
  ),
  -- Consecutive days share the same (day - row_number) value.
  grouped as (
    select day,
           day - (row_number() over (order by day))::int as grp
    from days
  ),
  runs as (
    select grp, count(*)::int as len, max(day) as last_day
    from grouped
    group by grp
  )
  select
    coalesce(
      (select len from runs
        where last_day >= today - 1
        order by last_day desc
        limit 1),
      0
    ) as current_days,
    coalesce((select max(len) from runs), 0) as best_days;
end;
$$;

-- Backfill: give existing readers credit for the days they already posted.
insert into public.activity_days (user_id, day)
select author_id, (created_at at time zone 'utc')::date
from public.posts
on conflict (user_id, day) do nothing;

-- 4. Expose rating on the feed view ------------------------------------------
-- Postgres will not let "create or replace view" insert a column in the middle
-- of the existing column list, so the view is dropped and rebuilt.

drop view if exists public.feed_posts;

create view public.feed_posts
with (security_invoker = true) as
  select
    p.id,
    p.body,
    p.kind,
    p.rating,
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
