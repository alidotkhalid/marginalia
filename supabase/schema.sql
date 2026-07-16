-- ============================================================================
-- Marginalia — Database schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It is idempotent-ish: safe to read top-to-bottom on a fresh project.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- Supabase already manages auth in the private `auth.users` table. We mirror
-- public, shareable fields here, keyed 1:1 to the auth user via `id`.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  username            text unique not null
                        check (char_length(username) between 3 and 24
                               and username ~ '^[a-z0-9_]+$'),
  display_name        text check (char_length(display_name) <= 60),
  bio                 text check (char_length(bio) <= 280),
  -- The book the user is currently reading (nullable). Cover art is derived
  -- from the Open Library key at render time — we never store images.
  -- NOTE: the FK to books is added via ALTER below, since books is defined next.
  currently_reading   uuid,
  -- How far along the reader is in their current book, 0–100%.
  reading_progress    smallint not null default 0
                        check (reading_progress between 0 and 100),
  -- Profile customization
  accent_color        text not null default '#b1934f'
                        check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  banner_style        text not null default 'gradient'
                        check (banner_style in ('gradient', 'shelf', 'marble', 'plain')),
  -- Chosen preset pixel-art avatar icon id (null = auto identicon).
  avatar_icon         text,
  created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. BOOKS
-- A local cache of Open Library metadata. We de-duplicate on `olid` (the
-- Open Library work/edition key, e.g. "OL45804W"). No image bytes are stored;
-- only `cover_id` is kept so the client can build a covers.openlibrary.org URL.
-- ----------------------------------------------------------------------------
create table if not exists public.books (
  id           uuid primary key default gen_random_uuid(),
  olid         text unique not null,          -- Open Library key
  title        text not null,
  author       text,
  cover_id     bigint,                        -- Open Library cover_i (nullable)
  first_year   int,
  created_at   timestamptz not null default now()
);

-- Now that books exists, wire up the profiles.currently_reading foreign key.
alter table public.profiles
  drop constraint if exists profiles_currently_reading_fkey;
alter table public.profiles
  add constraint profiles_currently_reading_fkey
  foreign key (currently_reading) references public.books (id) on delete set null;

-- ----------------------------------------------------------------------------
-- 3. POSTS
-- Short, text-first "reading notes". Tied to a book. Character-limited at the
-- database level (defense in depth) to enforce concise, thoughtful writing.
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  book_id      uuid references public.books (id) on delete set null,
  -- A post can hold up to three text sections; at least one must be present.
  text_note    text check (char_length(text_note) between 1 and 2000),
  text_quote   text check (char_length(text_quote) between 1 and 2000),
  text_review  text check (char_length(text_review) between 1 and 2000),
  -- Legacy single body/kind, kept for the primary section + backward compat.
  body         text check (char_length(body) between 1 and 2000),
  kind         text not null default 'note'
                 check (kind in ('note', 'quote', 'review')),
  -- Genre tag (slug from the app's genre list), used for hashtag browsing.
  genre        text,
  -- When a post answers an "Ask", the question + asker are stored for display.
  answer_question text,
  answer_asker    text,
  created_at   timestamptz not null default now(),
  constraint posts_has_section
    check (coalesce(text_note, text_quote, text_review, body) is not null)
);

create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx
  on public.posts (created_at desc);

-- ----------------------------------------------------------------------------
-- 4. FOLLOWS
-- Directed edges: `follower_id` follows `following_id`.
-- ----------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)         -- cannot follow yourself
);

create index if not exists follows_following_idx
  on public.follows (following_id);

-- ----------------------------------------------------------------------------
-- 5. READ_BOOKS — a reader's shelf of finished books (grows over time).
-- ----------------------------------------------------------------------------
create table if not exists public.read_books (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  book_id      uuid not null references public.books (id) on delete cascade,
  finished_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists read_books_user_idx
  on public.read_books (user_id, finished_at desc);

-- ----------------------------------------------------------------------------
-- 6. COMMENTS — short replies on a post.
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  -- A reply points at its parent comment (null = top-level).
  parent_id   uuid references public.comments (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists comments_parent_idx on public.comments (parent_id);

create index if not exists comments_post_idx
  on public.comments (post_id, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Everything is locked down by default; policies grant the minimum needed.
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.books      enable row level security;
alter table public.posts      enable row level security;
alter table public.follows    enable row level security;
alter table public.read_books enable row level security;
alter table public.comments   enable row level security;

-- PROFILES ------------------------------------------------------------------
-- Profiles are public (needed to render feeds & profile pages).
create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- BOOKS ---------------------------------------------------------------------
-- Book metadata is public; any authenticated user may cache a new book.
create policy "books are viewable by everyone"
  on public.books for select using (true);

create policy "authenticated users can add books"
  on public.books for insert to authenticated with check (true);

-- POSTS ---------------------------------------------------------------------
-- Posts are public to read; you may only write/edit/delete your own.
create policy "posts are viewable by everyone"
  on public.posts for select using (true);

create policy "users can create their own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = author_id);

create policy "users update their own posts"
  on public.posts for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "users can delete their own posts"
  on public.posts for delete using (auth.uid() = author_id);

-- FOLLOWS -------------------------------------------------------------------
create policy "follows are viewable by everyone"
  on public.follows for select using (true);

create policy "users can follow on their own behalf"
  on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);

create policy "users can unfollow on their own behalf"
  on public.follows for delete using (auth.uid() = follower_id);

-- READ_BOOKS ----------------------------------------------------------------
create policy "read shelves are viewable by everyone"
  on public.read_books for select using (true);

create policy "users add to their own shelf"
  on public.read_books for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users remove from their own shelf"
  on public.read_books for delete using (auth.uid() = user_id);

-- COMMENTS ------------------------------------------------------------------
-- Visible iff the underlying post is visible (posts RLS filters the subquery).
create policy "comments visible with their post"
  on public.comments for select using (
    exists (select 1 from public.posts p where p.id = comments.post_id)
  );

create policy "users comment on visible posts"
  on public.comments for insert to authenticated with check (
    auth.uid() = author_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "authors delete own or on their post"
  on public.comments for delete using (
    auth.uid() = author_id
    or exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.author_id = auth.uid()
    )
  );

-- ============================================================================
-- DRAFTS — private posts-in-progress, saved to finish later.
-- ============================================================================
create table if not exists public.drafts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  text_note     text,
  text_quote    text,
  text_review   text,
  genre         text,
  book_olid     text,
  book_title    text,
  book_author   text,
  book_cover_id bigint,
  updated_at    timestamptz not null default now()
);

create index if not exists drafts_author_idx
  on public.drafts (author_id, updated_at desc);

alter table public.drafts enable row level security;

create policy "owners read their drafts"
  on public.drafts for select using (auth.uid() = author_id);
create policy "owners create their drafts"
  on public.drafts for insert to authenticated with check (auth.uid() = author_id);
create policy "owners update their drafts"
  on public.drafts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "owners delete their drafts"
  on public.drafts for delete using (auth.uid() = author_id);

-- ============================================================================
-- ASKS — followers can ask questions; answering creates a post.
-- ============================================================================
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
    where follower_id = new.asker_id and following_id = new.target_id
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

create policy "asks visible to target or asker"
  on public.asks for select using (auth.uid() = target_id or auth.uid() = asker_id);
create policy "followers create asks"
  on public.asks for insert to authenticated with check (auth.uid() = asker_id);
create policy "target or asker delete asks"
  on public.asks for delete using (auth.uid() = target_id or auth.uid() = asker_id);

-- ============================================================================
-- LIKES — hearts on posts.
-- ============================================================================
create table if not exists public.likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_post_idx on public.likes (post_id);

alter table public.likes enable row level security;

create policy "likes are viewable by everyone"
  on public.likes for select using (true);
create policy "users like on their own behalf"
  on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "users unlike on their own behalf"
  on public.likes for delete using (auth.uid() = user_id);

-- ============================================================================
-- SAVES — private bookmarks of reads.
-- ============================================================================
create table if not exists public.saves (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists saves_user_idx on public.saves (user_id, created_at desc);

alter table public.saves enable row level security;

create policy "owners see their saves"
  on public.saves for select using (auth.uid() = user_id);
create policy "owners save on their own behalf"
  on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "owners unsave on their own behalf"
  on public.saves for delete using (auth.uid() = user_id);

-- ============================================================================
-- COMMENT_VOTES — upvote/downvote on comments.
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

-- ============================================================================
-- TAG_FOLLOWS — genre tags a reader follows.
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

-- ============================================================================
-- ROOMS — live reading rooms (ambient co-presence + shared timer).
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

create policy "rooms are viewable by everyone"
  on public.rooms for select using (true);
create policy "authenticated users create rooms"
  on public.rooms for insert to authenticated with check (created_by = auth.uid());
create policy "participants update their room"
  on public.rooms for update using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id and rp.user_id = auth.uid()
    )
  );
create policy "creator deletes their room"
  on public.rooms for delete using (created_by = auth.uid());

create policy "participants are viewable by everyone"
  on public.room_participants for select using (true);
create policy "users join on their own behalf"
  on public.room_participants for insert to authenticated with check (user_id = auth.uid());
create policy "users update their own participation"
  on public.room_participants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users leave on their own behalf"
  on public.room_participants for delete using (user_id = auth.uid());

-- ============================================================================
-- TRIGGER: auto-create a profile row when a new auth user signs up.
-- The username is passed through auth `raw_user_meta_data.username` at signup.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      -- Fallback: derive a safe handle from the email local-part.
      lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'))
    ),
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- CONVENIENCE VIEW: the chronological feed for a given viewer.
-- Returns posts authored by people the viewer follows, plus their own posts,
-- newest first, with author + book fields joined in.
-- ============================================================================
create or replace view public.feed_posts
with (security_invoker = true) as
  select
    p.id,
    p.body,
    p.kind,
    p.created_at,
    p.author_id,
    prof.username      as author_username,
    prof.display_name  as author_display_name,
    prof.avatar_icon   as author_avatar_icon,
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
    p.answer_asker,
    (select count(*) from public.likes lk where lk.post_id = p.id)::int as like_count,
    exists (
      select 1 from public.likes lk
      where lk.post_id = p.id and lk.user_id = auth.uid()
    ) as liked_by_me,
    exists (
      select 1 from public.saves sv
      where sv.post_id = p.id and sv.user_id = auth.uid()
    ) as saved_by_me
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
