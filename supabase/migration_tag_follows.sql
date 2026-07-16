-- ============================================================================
-- Migration: follow genre tags. Reads on followed tags appear under
-- "Tags you follow".
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.tag_follows (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tag         text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, tag)
);

create index if not exists tag_follows_user_idx on public.tag_follows (user_id);

alter table public.tag_follows enable row level security;

create policy "owners read their tag follows"
  on public.tag_follows for select using (auth.uid() = user_id);
create policy "owners follow tags"
  on public.tag_follows for insert to authenticated with check (auth.uid() = user_id);
create policy "owners unfollow tags"
  on public.tag_follows for delete using (auth.uid() = user_id);
