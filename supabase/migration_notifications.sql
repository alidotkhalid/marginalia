-- ---------------------------------------------------------------------------
-- Notifications: remember when a reader last looked, and count what is new.
--
-- 1. profiles.notifications_seen_at   when they last opened Notifications
-- 2. unseen_notifications(uid)        how many things are waiting
-- 3. mark_notifications_seen()        called when they open the page
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists notifications_seen_at timestamptz not null default now();

-- Everything waiting on a reader, in one number, for the nav dot:
--   pending follow requests + room invitations (these persist until acted on)
--   new followers + comments on their reads since they last looked
create or replace function public.unseen_notifications(uid uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select (
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
  )::int;
$$;

-- Called when the reader opens Notifications.
create or replace function public.mark_notifications_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set notifications_seen_at = now()
   where id = auth.uid();
$$;
