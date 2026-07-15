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
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

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
    b.olid             as book_olid,
    b.title            as book_title,
    b.author           as book_author,
    b.cover_id         as book_cover_id,
    p.genre,
    (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
    p.text_note,
    p.text_quote,
    p.text_review
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  left join public.books b   on b.id = p.book_id
  order by p.created_at desc;
