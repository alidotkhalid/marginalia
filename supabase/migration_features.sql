-- ---------------------------------------------------------------------------
-- Feature batch: Want-to-Read shelf, @mentions, buddy-read rooms.
--
-- 1. read_books.status      'finished' (default) or 'to-read'
-- 2. mentions               @username in a comment notifies that reader
-- 3. rooms.book_*           a room can carry the book being read together
-- 4. unseen_notifications   now counts mentions too
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. Want-to-Read -------------------------------------------------------------

alter table public.read_books
  add column if not exists status text not null default 'finished';

alter table public.read_books drop constraint if exists read_books_status_check;
alter table public.read_books
  add constraint read_books_status_check
  check (status in ('finished', 'to-read'));

-- Owners may move a book between shelves.
drop policy if exists "own read_books update" on public.read_books;
create policy "own read_books update"
  on public.read_books for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Mentions -----------------------------------------------------------------
-- Parsed from comment bodies by the trigger below, so no client can forge a
-- mention by another author.

create table if not exists public.mentions (
  comment_id   uuid not null references public.comments (id) on delete cascade,
  mentioned_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (comment_id, mentioned_id)
);

create index if not exists mentions_mentioned_idx
  on public.mentions (mentioned_id, created_at desc);

alter table public.mentions enable row level security;

drop policy if exists "mentions visible to the mentioned" on public.mentions;
create policy "mentions visible to the mentioned"
  on public.mentions for select
  using (mentioned_id = auth.uid());

-- Rows are written only by this trigger (as the definer).
create or replace function public.handle_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mentions (comment_id, mentioned_id)
  select new.id, p.id
  from (
    select distinct lower(m[1]) as handle
    from regexp_matches(new.body, '@([a-zA-Z0-9_]{3,24})', 'g') as m
  ) h
  join public.profiles p on p.username = h.handle
  where p.id <> new.author_id
    -- a block on either side silences the ping
    and not public.has_blocked(p.id, new.author_id)
    and not public.has_blocked(new.author_id, p.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_comment_mentions on public.comments;
create trigger on_comment_mentions
  after insert on public.comments
  for each row execute function public.handle_comment_mentions();

-- 3. Buddy-read rooms ---------------------------------------------------------

alter table public.rooms add column if not exists book_olid text;
alter table public.rooms add column if not exists book_title text;
alter table public.rooms add column if not exists book_cover_id bigint;

-- 4. Mentions join the unseen count ------------------------------------------

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
    +
    (select count(*) from public.mentions m
      where m.mentioned_id = uid
        and m.created_at > (
          select coalesce(p.notifications_seen_at, to_timestamp(0))
          from public.profiles p where p.id = uid
        ))
  )::int;
$$;
