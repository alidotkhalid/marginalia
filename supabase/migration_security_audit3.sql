-- ---------------------------------------------------------------------------
-- Third security audit: room takeover + handle immutability.
--
-- 1. Room takeover (real privilege escalation)
--    The rooms UPDATE policy let *any participant* update *any column*. Since
--    joining a room is open to everyone, a visitor could rename someone else's
--    room, change its book or genre, or set created_by to themselves and so
--    take over the right to delete it.
--
--    RLS cannot restrict columns, so column-level grants do it: authenticated
--    users may update only timer_ends_at, which is the sole field the app
--    changes. The participant policy still decides *which* rooms.
--
-- 2. Handles were mutable
--    profiles UPDATE let a reader change their own username, though the app
--    presents @handle as permanent and links/mentions rely on it. A trigger now
--    refuses changes, so a handle cannot be swapped out from under a mention or
--    a shared profile link.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. Rooms: participants may only touch the shared timer --------------------

revoke update on public.rooms from anon, authenticated;
grant update (timer_ends_at) on public.rooms to authenticated;

-- The row-level rule stays: you must be sitting in the room.
drop policy if exists "participants update their room" on public.rooms;
create policy "participants update the room timer"
  on public.rooms for update
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id and rp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id and rp.user_id = auth.uid()
    )
  );

-- 2. Usernames are permanent -------------------------------------------------

create or replace function public.freeze_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'Your @handle cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_freeze_username on public.profiles;
create trigger profiles_freeze_username
  before update on public.profiles
  for each row execute function public.freeze_username();

-- 3. Book cache: bound the shared, client-writable columns -------------------
-- Defence in depth behind the same caps now applied in upsertBook().

alter table public.books drop constraint if exists books_olid_len;
alter table public.books
  add constraint books_olid_len check (char_length(olid) between 1 and 64);

alter table public.books drop constraint if exists books_title_len;
alter table public.books
  add constraint books_title_len check (char_length(title) between 1 and 300);

alter table public.books drop constraint if exists books_author_len;
alter table public.books
  add constraint books_author_len check (author is null or char_length(author) <= 200);
