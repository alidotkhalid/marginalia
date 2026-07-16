-- ============================================================================
-- Migration: upvote / downvote on comments.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.comment_votes (
  comment_id  uuid not null references public.comments (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_votes_comment_idx
  on public.comment_votes (comment_id);

alter table public.comment_votes enable row level security;

create policy "comment votes are viewable by everyone"
  on public.comment_votes for select using (true);
create policy "users vote on their own behalf"
  on public.comment_votes for insert to authenticated with check (auth.uid() = user_id);
create policy "users change their own votes"
  on public.comment_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users remove their own votes"
  on public.comment_votes for delete using (auth.uid() = user_id);
