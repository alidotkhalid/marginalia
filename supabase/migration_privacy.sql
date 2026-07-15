-- ============================================================================
-- Migration: private accounts (follow approval) + blocking
-- Run ONCE in the Supabase SQL Editor. Adds columns/tables, a follow trigger,
-- SECURITY DEFINER helper functions, and rewrites post visibility rules.
--
-- Why SECURITY DEFINER helpers? Referencing other tables directly inside an
-- RLS policy can trigger recursive RLS evaluation. Wrapping those lookups in
-- SECURITY DEFINER functions runs them with owner privileges (bypassing RLS on
-- the helper's internal reads), which is the supported, leak-safe pattern.
-- ============================================================================

-- --- Columns / tables ------------------------------------------------------
alter table public.profiles
  add column if not exists is_private boolean not null default false;

alter table public.follows
  add column if not exists status text not null default 'accepted'
    check (status in ('pending', 'accepted'));

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

-- --- Helper functions (SECURITY DEFINER, read-only) ------------------------
create or replace function public.is_profile_public(pid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select not is_private from public.profiles where id = pid), true);
$$;

create or replace function public.is_accepted_follower(viewer uuid, target uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.follows
    where follower_id = viewer and following_id = target and status = 'accepted'
  );
$$;

create or replace function public.has_blocked(blocker uuid, blocked uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.blocks where blocker_id = blocker and blocked_id = blocked
  );
$$;

-- Can the current user see the given profile's content? (self / public / accepted)
create or replace function public.i_am_blocked_by(target uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.blocks where blocker_id = target and blocked_id = auth.uid()
  );
$$;

-- --- Follow trigger: set status by target privacy; forbid across a block ----
create or replace function public.handle_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.blocks
    where (blocker_id = new.following_id and blocked_id = new.follower_id)
       or (blocker_id = new.follower_id and blocked_id = new.following_id)
  ) then
    raise exception 'Cannot follow: a block is in place.';
  end if;

  if (select is_private from public.profiles where id = new.following_id) then
    new.status := 'pending';
  else
    new.status := 'accepted';
  end if;
  return new;
end $$;

drop trigger if exists on_follow_insert on public.follows;
create trigger on_follow_insert
  before insert on public.follows
  for each row execute function public.handle_follow();

-- --- BLOCKS policies -------------------------------------------------------
drop policy if exists "users see their own blocks" on public.blocks;
create policy "users see their own blocks"
  on public.blocks for select using (auth.uid() = blocker_id);

drop policy if exists "users create their own blocks" on public.blocks;
create policy "users create their own blocks"
  on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);

drop policy if exists "users remove their own blocks" on public.blocks;
create policy "users remove their own blocks"
  on public.blocks for delete using (auth.uid() = blocker_id);

-- --- FOLLOWS policies: let the target accept/reject incoming requests -------
drop policy if exists "targets accept incoming follows" on public.follows;
create policy "targets accept incoming follows"
  on public.follows for update
  using (auth.uid() = following_id) with check (auth.uid() = following_id);

drop policy if exists "targets remove incoming follows" on public.follows;
create policy "targets remove incoming follows"
  on public.follows for delete using (auth.uid() = following_id);

-- --- POSTS visibility: rewrite the blanket "everyone" rule -----------------
drop policy if exists "posts are viewable by everyone" on public.posts;
drop policy if exists "posts visible per privacy and blocks" on public.posts;
create policy "posts visible per privacy and blocks"
  on public.posts for select using (
    auth.uid() = author_id
    or (
      (
        public.is_profile_public(author_id)
        or public.is_accepted_follower(auth.uid(), author_id)
      )
      and not public.has_blocked(author_id, auth.uid())
    )
  );
