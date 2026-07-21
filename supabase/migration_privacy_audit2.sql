-- ---------------------------------------------------------------------------
-- Pre-launch privacy audit.
--
-- 1. can_see_profile()   one helper for "may the caller see this reader?"
-- 2. Argument order bug  is_accepted_follower(viewer, target) was called with
--                        its arguments reversed in the activity_days policy and
--                        in reading_streak, so a private reader's streak was
--                        shown to people *they* follow rather than to their own
--                        approved followers.
-- 3. read_books          a private reader's finished shelf and to-read pile
--                        were readable by anyone through the API.
-- 4. follows             a private reader's follower/following graph was
--                        readable by anyone through the API.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. One helper, used everywhere, so the argument order can't be got wrong.
create or replace function public.can_see_profile(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    target = auth.uid()
    or public.is_profile_public(target)
    -- is_accepted_follower(viewer, target): the caller follows the target.
    or public.is_accepted_follower(auth.uid(), target);
$$;

-- 2. Reading activity: correct the reversed check.
drop policy if exists "activity readable by owner and followers" on public.activity_days;
create policy "activity readable by owner and followers"
  on public.activity_days for select
  using (public.can_see_profile(user_id));

create or replace function public.reading_streak(uid uuid)
returns table (current_days int, best_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date;
begin
  if not public.can_see_profile(uid) then
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

-- 3. Shelves follow the same visibility rule as reads.
drop policy if exists "read shelves are viewable by everyone" on public.read_books;
drop policy if exists "read shelves visible per privacy" on public.read_books;
create policy "read shelves visible per privacy"
  on public.read_books for select
  using (public.can_see_profile(user_id));

-- 4. The follow graph. An edge is visible when you are one of its two ends, or
--    when you are allowed to see both ends. Counts on public profiles keep
--    working; a private reader's followers stay private.
drop policy if exists "follows are viewable by everyone" on public.follows;
drop policy if exists "follows visible per privacy" on public.follows;
create policy "follows visible per privacy"
  on public.follows for select
  using (
    follower_id = auth.uid()
    or following_id = auth.uid()
    or (
      public.can_see_profile(follower_id)
      and public.can_see_profile(following_id)
    )
  );
