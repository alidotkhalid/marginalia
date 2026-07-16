-- ============================================================================
-- Migration: Live reading rooms — ambient co-presence with a shared timer and
-- a live list of who's reading and their current page.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 60),
  created_by    uuid references public.profiles (id) on delete set null,
  timer_ends_at timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.room_participants (
  room_id       uuid not null references public.rooms (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  book_title    text,
  current_page  int not null default 0 check (current_page between 0 and 100000),
  joined_at     timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists room_participants_room_idx
  on public.room_participants (room_id, last_seen desc);

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;

-- Rooms are public to browse and join.
create policy "rooms are viewable by everyone"
  on public.rooms for select using (true);
create policy "authenticated users create rooms"
  on public.rooms for insert to authenticated with check (created_by = auth.uid());
-- Only participants may change a room (e.g. start/stop the shared timer).
create policy "participants update their room"
  on public.rooms for update using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id and rp.user_id = auth.uid()
    )
  );
create policy "creator deletes their room"
  on public.rooms for delete using (created_by = auth.uid());

-- Participant rows are public (so the room shows everyone); you manage your own.
create policy "participants are viewable by everyone"
  on public.room_participants for select using (true);
create policy "users join on their own behalf"
  on public.room_participants for insert to authenticated with check (user_id = auth.uid());
create policy "users update their own participation"
  on public.room_participants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users leave on their own behalf"
  on public.room_participants for delete using (user_id = auth.uid());
