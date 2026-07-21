-- ---------------------------------------------------------------------------
-- True profile counts, including on private profiles.
--
-- The follow-graph and shelf policies hide the rows themselves, which also hid
-- the totals. This definer function returns only the three numbers, never any
-- names or titles, so a private profile reads naturally without revealing who
-- follows whom or what they have read.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

drop function if exists public.follow_counts(uuid);

create or replace function public.profile_counts(uid uuid)
returns table (followers int, following int, books int)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*) from public.follows f
      where f.following_id = uid and f.status = 'accepted')::int as followers,
    (select count(*) from public.follows f
      where f.follower_id = uid and f.status = 'accepted')::int as following,
    (select count(*) from public.read_books rb
      where rb.user_id = uid and rb.status <> 'to-read')::int as books;
$$;

-- Totals are public information; the underlying rows are not.
grant execute on function public.profile_counts(uuid) to anon, authenticated;
