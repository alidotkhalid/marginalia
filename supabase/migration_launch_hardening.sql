-- ---------------------------------------------------------------------------
-- Launch hardening: rate limits + stale room cleanup.
--
-- 1. Rate limits    triggers that refuse a flood of posts, comments, rooms,
--                   or room invites from one account
-- 2. Room cleanup   cleanup_stale_rooms() removes rooms nobody has sat in
--                   for 30 days (called when the rooms page loads)
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. Rate limits --------------------------------------------------------------
-- Generous for a human, impossible for a spam script. The exception message is
-- shown to the user, so it is written for people.

create or replace function public.enforce_post_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.posts
       where author_id = new.author_id
         and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You are posting very fast. Give it a minute.';
  end if;
  if (select count(*) from public.posts
       where author_id = new.author_id
         and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'That is a lot of reads in an hour. Take a break and come back.';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_post_rate();

create or replace function public.enforce_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.comments
       where author_id = new.author_id
         and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'You are commenting very fast. Give it a minute.';
  end if;
  if (select count(*) from public.comments
       where author_id = new.author_id
         and created_at > now() - interval '1 hour') >= 120 then
    raise exception 'That is a lot of comments in an hour. Take a break and come back.';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate();

create or replace function public.enforce_room_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.rooms
       where created_by = new.created_by
         and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'You have opened several rooms just now. Sit in one for a while first.';
  end if;
  return new;
end;
$$;

drop trigger if exists rooms_rate_limit on public.rooms;
create trigger rooms_rate_limit
  before insert on public.rooms
  for each row execute function public.enforce_room_rate();

create or replace function public.enforce_invite_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.room_invites
       where inviter_id = new.inviter_id
         and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'You have sent a lot of invitations. Try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists invites_rate_limit on public.room_invites;
create trigger invites_rate_limit
  before insert on public.room_invites
  for each row execute function public.enforce_invite_rate();

-- 2. Stale room cleanup -------------------------------------------------------
-- A room is stale when it is over 30 days old and nobody has been seen in it
-- for 30 days (or it never had a sitter at all). Runs as the definer so RLS
-- (which only lets creators delete) does not stop the sweep. Pending invites
-- to a deleted room cascade away with it.

create or replace function public.cleanup_stale_rooms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  with stale as (
    select r.id
    from public.rooms r
    where r.created_at < now() - interval '30 days'
      and not exists (
        select 1 from public.room_participants rp
        where rp.room_id = r.id
          and rp.last_seen > now() - interval '30 days'
      )
  )
  delete from public.rooms
   where id in (select id from stale);
  get diagnostics removed = row_count;
  return removed;
end;
$$;
