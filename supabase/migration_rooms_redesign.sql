-- ---------------------------------------------------------------------------
-- Rooms redesign: a genre and a reading mode per room, plus invitations.
--
-- 1. rooms.genre   the general genre of the books read here ('mixed' allowed)
-- 2. rooms.mode    quiet | sprints | open
-- 3. room_invites  one reader inviting another into a room
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1 + 2. Room shape ----------------------------------------------------------

alter table public.rooms
  add column if not exists genre text not null default 'mixed';

alter table public.rooms
  add column if not exists mode text not null default 'quiet';

-- Modes drive the filter pills on the rooms page.
alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms
  add constraint rooms_mode_check
  check (mode in ('quiet', 'sprints', 'open'));

create index if not exists rooms_genre_idx on public.rooms (genre);

-- 3. Invitations -------------------------------------------------------------

create table if not exists public.room_invites (
  room_id    uuid not null references public.rooms (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, invitee_id),
  check (inviter_id <> invitee_id)
);

create index if not exists room_invites_invitee_idx
  on public.room_invites (invitee_id, created_at desc);

alter table public.room_invites enable row level security;

-- You can see invitations you sent or received.
drop policy if exists "invites visible to both sides" on public.room_invites;
create policy "invites visible to both sides"
  on public.room_invites for select
  using (invitee_id = auth.uid() or inviter_id = auth.uid());

-- Anyone signed in may invite, as themselves, and not someone who blocked them.
drop policy if exists "readers send invites" on public.room_invites;
create policy "readers send invites"
  on public.room_invites for insert to authenticated
  with check (
    inviter_id = auth.uid()
    -- neither side has blocked the other
    and not public.has_blocked(invitee_id, auth.uid())
    and not public.has_blocked(auth.uid(), invitee_id)
  );

-- Either side can clear it: the invitee dismisses or joins, the inviter retracts.
drop policy if exists "either side clears an invite" on public.room_invites;
create policy "either side clears an invite"
  on public.room_invites for delete
  using (invitee_id = auth.uid() or inviter_id = auth.uid());
