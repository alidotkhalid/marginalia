-- ============================================================================
-- Migration: "Ask the reader" — followers can ask questions; answering an ask
-- creates a post on the answerer's profile showing the original question.
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================================

-- --- Asks --------------------------------------------------------------------
create table if not exists public.asks (
  id          uuid primary key default gen_random_uuid(),
  asker_id    uuid not null references public.profiles (id) on delete cascade,
  target_id   uuid not null references public.profiles (id) on delete cascade,
  question    text not null check (char_length(question) between 1 and 300),
  created_at  timestamptz not null default now(),
  check (asker_id <> target_id)
);

create index if not exists asks_target_idx
  on public.asks (target_id, created_at desc);

alter table public.asks enable row level security;

-- Only an accepted follower (and not across a block) may ask.
create or replace function public.handle_ask()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.blocks
    where (blocker_id = new.target_id and blocked_id = new.asker_id)
       or (blocker_id = new.asker_id and blocked_id = new.target_id)
  ) then
    raise exception 'Cannot ask: a block is in place.';
  end if;

  if not exists (
    select 1 from public.follows
    where follower_id = new.asker_id
      and following_id = new.target_id
      and status = 'accepted'
  ) then
    raise exception 'You can only ask people you follow.';
  end if;

  return new;
end $$;

drop trigger if exists on_ask_insert on public.asks;
create trigger on_ask_insert
  before insert on public.asks
  for each row execute function public.handle_ask();

-- Policies
drop policy if exists "asks visible to target or asker" on public.asks;
create policy "asks visible to target or asker"
  on public.asks for select
  using (auth.uid() = target_id or auth.uid() = asker_id);

drop policy if exists "followers create asks" on public.asks;
create policy "followers create asks"
  on public.asks for insert to authenticated with check (auth.uid() = asker_id);

drop policy if exists "target or asker delete asks" on public.asks;
create policy "target or asker delete asks"
  on public.asks for delete
  using (auth.uid() = target_id or auth.uid() = asker_id);

-- --- Answer context on posts -------------------------------------------------
alter table public.posts add column if not exists answer_question text;
alter table public.posts add column if not exists answer_asker text;

-- --- Recreate the feed view with the answer columns --------------------------
drop view if exists public.feed_posts;
create view public.feed_posts
with (security_invoker = true) as
  select
    p.id,
    p.body,
    p.kind,
    p.created_at,
    p.author_id,
    prof.username      as author_username,
    prof.display_name  as author_display_name,
    b.olid             as book_olid,
    b.title            as book_title,
    b.author           as book_author,
    b.cover_id         as book_cover_id,
    p.genre,
    (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
    p.text_note,
    p.text_quote,
    p.text_review,
    p.answer_question,
    p.answer_asker
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
