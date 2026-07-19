-- ---------------------------------------------------------------------------
-- Security audit fixes.
--
-- 1. unseen_notifications  could be called with anyone's id, leaking how many
--                          requests/comments another reader has waiting.
--                          Now answers only for the caller.
-- 2. reading_streak        ran as definer, so it bypassed activity_days RLS
--                          and leaked private accounts' reading activity.
--                          Now respects profile visibility.
-- 3. Internal helpers      mark_active / user_day are no longer callable
--                          directly by clients (triggers still use them).
-- 4. Rate limits           asks, follows, drafts, and book inserts join the
--                          existing post/comment/room/invite limits.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. Notifications count: yours and only yours -------------------------------

create or replace function public.unseen_notifications(uid uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select case
    when uid is distinct from auth.uid() then 0
    else (
      (select count(*) from public.follows f
        where f.following_id = uid and f.status = 'pending')
      +
      (select count(*) from public.room_invites ri
        where ri.invitee_id = uid)
      +
      (select count(*) from public.follows f
        where f.following_id = uid
          and f.status = 'accepted'
          and f.created_at > (
            select coalesce(p.notifications_seen_at, to_timestamp(0))
            from public.profiles p where p.id = uid
          ))
      +
      (select count(*) from public.comments c
        join public.posts po on po.id = c.post_id
        where po.author_id = uid
          and c.author_id <> uid
          and c.created_at > (
            select coalesce(p.notifications_seen_at, to_timestamp(0))
            from public.profiles p where p.id = uid
          ))
      +
      (select count(*) from public.mentions m
        where m.mentioned_id = uid
          and m.created_at > (
            select coalesce(p.notifications_seen_at, to_timestamp(0))
            from public.profiles p where p.id = uid
          ))
    )
  end::int;
$$;

-- 2. Streaks respect profile privacy -----------------------------------------

create or replace function public.reading_streak(uid uuid)
returns table (current_days int, best_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date;
begin
  -- The same visibility rule as the rest of a profile's content.
  if not (
    uid = auth.uid()
    or public.is_profile_public(uid)
    or public.is_accepted_follower(uid, auth.uid())
  ) then
    return query select 0, 0;
    return;
  end if;

  today := public.user_day(uid);

  return query
  with days as (
    select day from public.activity_days where user_id = uid
  ),
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

-- 3. Internal helpers are not a public API -----------------------------------

revoke execute on function public.mark_active(uuid) from public, anon, authenticated;
revoke execute on function public.user_day(uuid) from public, anon, authenticated;

-- 4. Remaining rate limits ----------------------------------------------------

-- Asks: questions to other readers. 5/minute, 30/hour.
create or replace function public.enforce_ask_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.asks
       where asker_id = new.asker_id
         and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You are asking very fast. Give it a minute.';
  end if;
  if (select count(*) from public.asks
       where asker_id = new.asker_id
         and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'That is a lot of questions in an hour. Try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists asks_rate_limit on public.asks;
create trigger asks_rate_limit
  before insert on public.asks
  for each row execute function public.enforce_ask_rate();

-- Follows: 60 new follows (or follow requests) per hour.
create or replace function public.enforce_follow_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.follows
       where follower_id = new.follower_id
         and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'You are following a lot of readers at once. Try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists follows_rate_limit on public.follows;
create trigger follows_rate_limit
  before insert on public.follows
  for each row execute function public.enforce_follow_rate();

-- Drafts: at most 200 per reader.
create or replace function public.enforce_draft_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.drafts
       where author_id = new.author_id) >= 200 then
    raise exception 'You have 200 drafts already. Post or delete a few first.';
  end if;
  return new;
end;
$$;

drop trigger if exists drafts_cap on public.drafts;
create trigger drafts_cap
  before insert on public.drafts
  for each row execute function public.enforce_draft_cap();

-- Books: the cache is insertable by any signed-in reader, so record who adds
-- each row and cap the pace. 1500/hour comfortably covers a full Goodreads
-- import while stopping a junk-data flood.
alter table public.books
  add column if not exists created_by uuid default auth.uid();

create or replace function public.enforce_book_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.books
     where created_by = auth.uid()
       and created_at > now() - interval '1 hour'
  ) >= 1500 then
    raise exception 'Too many new books at once. Try again in an hour.';
  end if;
  return new;
end;
$$;

drop trigger if exists books_rate_limit on public.books;
create trigger books_rate_limit
  before insert on public.books
  for each row execute function public.enforce_book_rate();
