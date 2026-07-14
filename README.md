# Marginalia

A distraction-free, text-first social network for readers. No algorithms, no video, no infinite scroll — just reading habits, "currently reading" statuses, and short, thoughtful notes on books.

Built with **Next.js (App Router)**, **Supabase** (Postgres + Auth), **Tailwind CSS**, and the **Open Library API** for book metadata and cover art. Designed in an elegant "Academia" aesthetic: parchment, forest green, mahogany, oxblood, and charcoal, set in Playfair Display / EB Garamond serifs.

---

## Architecture at a glance

```
Browser ──► Next.js (Vercel)
              │  Server Components + Server Actions
              ├──► Supabase  (Postgres, Auth, Row Level Security)
              └──► Open Library API  (book search + cover art, read-only)
```

- **Auth**: Supabase email/password. A Postgres trigger auto-creates a public `profiles` row on signup.
- **Data**: `profiles`, `books` (a cache of Open Library metadata), `posts` (character-limited notes tied to a book), `follows`. All protected by Row Level Security.
- **Feed**: strictly chronological — posts from people you follow (and yourself), newest first, capped at a finite page. No ranking.
- **Images**: cover art is fetched from `covers.openlibrary.org` at render time. Users never upload images.

---

## Project structure

```
marginalia/
├── app/
│   ├── layout.tsx              # Header/nav, session-aware
│   ├── page.tsx                # THE FEED (chronological timeline)
│   ├── actions.ts              # Server actions: createPost, follow, currently-reading
│   ├── api/books/route.ts      # Open Library search proxy
│   ├── login/ signup/          # Auth pages + actions
│   └── profile/[username]/     # Reader profile + note history
├── components/
│   ├── PostComposer.tsx        # Character-limited creation UI
│   ├── BookSearch.tsx          # Debounced Open Library search
│   ├── BookCover.tsx           # Cover art / typographic placeholder
│   ├── PostCard.tsx            # Index-card note
│   └── FollowButton.tsx
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   └── openlibrary.ts          # API wrapper + cover URL builder
├── supabase/schema.sql         # Run this in the Supabase SQL editor
├── tailwind.config.js          # "Academia" palette + serif fonts
└── middleware.ts               # Refreshes session, gates protected routes
```

---

## Local development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com → *New project*. Wait for it to provision.

3. **Run the schema.** In the Supabase dashboard open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates all tables, RLS policies, the signup trigger, and the `feed_posts` view.

4. **Configure environment variables.** Copy the example file and fill it in from **Supabase → Project Settings → API**:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. **(Optional) Disable email confirmation for faster local testing.** In **Supabase → Authentication → Providers → Email**, turn off "Confirm email" during development so signups log in immediately. Re-enable it for production.

6. **Run it.**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, create an account, search a book, and post your first note.

---

## Deployment pipeline (Vercel + Supabase)

### Step 1 — Push to Git

```bash
git init
git add .
git commit -m "Marginalia: initial commit"
git branch -M main
git remote add origin https://github.com/<you>/marginalia.git
git push -u origin main
```

`.gitignore` already excludes `.env.local`, so your keys never reach the repo.

### Step 2 — Prepare Supabase for production

Your Supabase project *is* the production backend — no separate deploy step. Just make sure:

- The `supabase/schema.sql` migration has been run (Step 3 above).
- **Authentication → URL Configuration → Site URL** is set to your production domain (e.g. `https://marginalia.vercel.app`).
- Add your Vercel URL(s) to **Redirect URLs** (include both the production domain and Vercel preview wildcard, e.g. `https://*.vercel.app`).
- **Email confirmation** is enabled for production.

### Step 3 — Import the repo into Vercel

1. Go to https://vercel.com → **Add New → Project** and import your GitHub repo.
2. Vercel auto-detects Next.js — leave the build command (`next build`) and output settings as default.
3. Before the first deploy, add **Environment Variables** (Settings → Environment Variables), for the **Production** (and Preview) environments:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` |

   The anon key is safe to expose to the browser — access is enforced by Supabase Row Level Security, not by hiding the key.

### Step 4 — Deploy

Click **Deploy**. Vercel builds and ships to a production URL. Every subsequent `git push` to `main` triggers an automatic production deploy; pull requests get preview deployments.

### Step 5 — Post-deploy checks

- Update `NEXT_PUBLIC_SITE_URL` and Supabase **Site URL / Redirect URLs** to the final domain if you add a custom one.
- Sign up with a real email and confirm the flow end-to-end (signup → confirm email → feed).
- Verify covers load (the `covers.openlibrary.org` host is already allow-listed in `next.config.js`).

---

## Design notes

- **Character limit** is enforced in three places for defense in depth: the `<textarea maxLength>`, the server action, and a Postgres `CHECK` constraint (`char_length(body) between 1 and 500`).
- **No infinite scroll**: the feed is a single `limit(50)` query. Deliberate finitude is a feature.
- **Security**: every table has RLS on; the anon key can only do what policies permit. Users can read public content but write only their own rows.
- **Tailwind version**: this uses Tailwind v3 with a `tailwind.config.js` (as requested). If you upgrade to v4, the palette moves into a CSS `@theme` block instead.
