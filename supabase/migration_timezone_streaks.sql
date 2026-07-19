-- ---------------------------------------------------------------------------
-- Timezone-aware streaks: a "day" is the reader's own day, not UTC's.
--
-- 1. profiles.tz        IANA timezone, synced quietly from the browser
-- 2. set_timezone()     validates + stores it
-- 3. user_day()         today's date in the reader's timezone
-- 4. mark_active / reading_streak now count days in the reader's timezone
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists tz text;

-- Store the browser's timezone. Validated by actually using it: an invalid
-- name raises, is swallowed, and nothing is stored.
create or replace function public.set_timezone(new_tz text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform now() at time zone new_tz;
  update public.profiles
     set tz = new_tz
   where id = auth.uid()
     and tz is distinct from new_tz;
exception when others then
  null;
end;
$$;

-- Today, as this reader experiences it. Falls back to UTC when unset.
create or replace function public.user_day(uid uuid)
returns date
language sql
security definer
stable
set search_path = public
as $$
  select (
    now() at time zone coalesce(
      (select tz from public.profiles where id = uid),
      'UTC'
    )
  )::date;
$$;

-- Record activity against the reader's own day.
create or replace function public.mark_active(uid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_days (user_id, day)
  values (uid, public.user_day(uid))
  on conflict (user_id, day) do nothing;
$$;

-- Streaks measured against the reader's own today.
create or replace function public.reading_streak(uid uuid)
returns table (current_days int, best_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := public.user_day(uid);
begin
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
