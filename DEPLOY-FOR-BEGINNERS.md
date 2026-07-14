# Putting Marginalia on the internet — a beginner's guide

You've never deployed a website before? Perfect. This guide assumes you know
nothing and walks you through every click. Take it slowly. There's nothing here
you can break permanently.

**What "deploying" means, in plain words:** right now your website lives only on
your computer. Deploying means copying it to computers on the internet (called
*servers*) so anyone with the link can visit it.

We'll use three free services. Think of them as three helpers:

| Helper | What it does | Think of it as… |
|--------|--------------|-----------------|
| **Supabase** | Stores your data (users, books, posts) and handles logins | The filing cabinet + the front-desk security guard |
| **GitHub** | Stores a copy of your code online | A locker where your code lives |
| **Vercel** | Turns your code into a live website | The publisher that prints and hands out your book |

The flow is: **your computer → GitHub (locker) → Vercel (live site)**, and the
live site talks to **Supabase** for data. You'll set them up in that order.

Total time: about 30–45 minutes. Grab a coffee.

---

## Before you start

You'll create **three free accounts**. Use the **same email** for all three to
keep life simple. A tip: you can sign into GitHub and Vercel and Supabase using a
Google account (the "Continue with Google" button) — that's one less password to
remember.

Have your project folder handy. It's the **`marginalia`** folder inside your
"Claude Playground" folder — the same place this guide is saved.

---

## PART 1 — Set up Supabase (your data + logins)

### 1.1 Create the account
1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up (the "Continue with GitHub" or "Continue with Google" button is fine).

### 1.2 Create a project
1. Click **New project**.
2. **Name:** type `marginalia`.
3. **Database Password:** click **Generate a password**, then **copy it and paste
   it somewhere safe** (a notes app is fine). You probably won't need it again,
   but don't lose it.
4. **Region:** pick the one closest to you.
5. Click **Create new project**. It takes a minute or two to build. ☕

### 1.3 Set up the database tables
1. On the left sidebar, click the **SQL Editor** icon (looks like `</>` or a
   database symbol).
2. Click **New query**.
3. Open the file **`marginalia/supabase/schema.sql`** on your computer (right-
   click → Open with → any text editor, e.g. Notepad). Select **all** the text
   (Ctrl+A) and copy it (Ctrl+C).
4. Paste it into the big empty box in the Supabase SQL Editor (Ctrl+V).
5. Click **Run** (bottom-right, or press Ctrl+Enter).
6. You should see **"Success. No rows returned."** That's good — it means your
   tables were created. ✅

### 1.4 Turn OFF email confirmation (just for now, to make testing easy)
1. Left sidebar → **Authentication** → **Sign In / Providers** (or "Providers").
2. Find **Email** and click it.
3. Turn **OFF** the "Confirm email" toggle, and **Save**.
   *(We'll turn it back on at the end. This just lets you log in instantly while
   testing.)*

### 1.5 Copy your two keys (you'll need these for Vercel)
1. Left sidebar → **Project Settings** (the gear icon) → **API**.
2. You'll see two things you need. **Copy each into your safe notes file:**
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **Publishable key** — starts with `sb_publishable_...`. *(This is the one
     that's safe to share publicly; it only works within the rules your database
     enforces. It used to be called the "anon public" key.)*

   ⚠️ **Do NOT use the Secret key** (`sb_secret_...`). That one has admin powers
   and must never go in your website. Just leave it alone for this project.

Keep this tab open; you'll come back. **Part 1 done!** 🎉

---

## PART 2 — Put your code on GitHub (using GitHub Desktop)

### 2.1 Create a GitHub account
1. Go to **https://github.com** and click **Sign up**. Follow the prompts.

### 2.2 Install GitHub Desktop (the point-and-click app)
1. Go to **https://desktop.github.com** and click **Download**.
2. Install it like any app, open it, and **sign in** with the GitHub account you
   just made.

### 2.3 Add your project to GitHub Desktop
1. In GitHub Desktop, click **File → Add local repository**
   (on Mac: **File → Add Local Repository**).
2. Click **Choose…** and navigate to your **`marginalia`** folder. Select it.
3. It may say *"This directory does not appear to be a Git repository — Create a
   repository?"* — click **create a repository** (that link), then click the
   **Create repository** button. (Leave the fields as they are.)

### 2.4 Publish it online
1. You'll now see a list of your files on the left. At the bottom-left there's a
   box that says "Summary". Type anything, e.g. `First version`, then click
   **Commit to main**. *(A "commit" is just a saved snapshot of your code.)*
2. At the top, click the big **Publish repository** button.
3. **Important:** in the pop-up, **UNCHECK** "Keep this code private" only if you
   want it public — either is fine. Leaving it checked (private) is perfectly OK
   and Vercel can still read it.
4. Click **Publish repository**.

Your code is now safely in the online locker. **Part 2 done!** 🎉

---

## PART 3 — Deploy on Vercel (make it live)

### 3.1 Create the account
1. Go to **https://vercel.com** and click **Sign Up**.
2. Choose **Continue with GitHub** (this links the two automatically). Approve
   any permission pop-ups from GitHub.

### 3.2 Import your project
1. On your Vercel dashboard, click **Add New… → Project**.
2. You'll see a list of your GitHub repositories. Find **marginalia** and click
   **Import**.
   *(If you don't see it, click "Adjust GitHub App Permissions" and give Vercel
   access to the repo.)*

### 3.3 Add your secret keys (environment variables)
This is the step people most often skip — **don't skip it**, or the site will
load but logins won't work.

1. On the import screen, expand the **Environment Variables** section.
2. Add these **two** entries (copy the values from your Supabase notes). For each
   one, type the Name, paste the Value, click **Add**:

   | Name (type exactly) | Value |
   |---------------------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from Part 1.5 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Publishable key (`sb_publishable_...`) from Part 1.5 |

   *(We'll add a third one, the site's own address, right after the first deploy —
   because you don't know the address yet!)*

### 3.4 Deploy
1. Click the big **Deploy** button.
2. Wait 1–3 minutes while Vercel builds your site. You'll see logs scrolling —
   that's normal.
3. When it's done you'll see **confetti** 🎉 and a preview image. Click
   **Continue to Dashboard**, then click the **Visit** button (or the domain
   shown, something like `marginalia-xxxx.vercel.app`).

**That link is your live website. It's on the internet right now.**

### 3.5 Add the third environment variable (the site's own address)
1. Copy your live address from the browser bar (e.g. `https://marginalia-xxxx.vercel.app`).
2. In Vercel: **Settings** (top menu) → **Environment Variables**.
3. Add one more:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SITE_URL` | your live address, e.g. `https://marginalia-xxxx.vercel.app` |

4. Click **Save**.
5. Go to the **Deployments** tab → click the **⋯** (three dots) on the top
   deployment → **Redeploy** → **Redeploy**. This makes the new setting take
   effect. **Part 3 done!** 🎉

---

## PART 4 — Introduce Vercel and Supabase to each other

Supabase needs to know your live address so logins redirect to the right place.

1. Back in **Supabase → Authentication → URL Configuration**.
2. **Site URL:** paste your live address (`https://marginalia-xxxx.vercel.app`).
3. **Redirect URLs:** click **Add URL** and add both:
   - `https://marginalia-xxxx.vercel.app/**`
   - `https://*.vercel.app/**`  *(this covers preview links Vercel makes later)*
4. **Save**.

---

## PART 5 — Try it out! 🎈

1. Open your live link.
2. Click **Join**, create an account (any email + a password of 8+ characters).
3. You should land on your feed. Search for a book (try "Dune"), write a note,
   and post it.
4. Visit your profile and set a "Currently Reading" book.

If that all works — **congratulations, you deployed a real, full-stack web app.**

---

## PART 6 — Turn email confirmation back ON (for real users)

Now that you've tested, make new signups confirm their email (good practice):

1. **Supabase → Authentication → Sign In / Providers → Email**.
2. Turn **ON** "Confirm email", and **Save**.

*(From now on, new users get a confirmation email before they can log in.)*

---

## Making changes later (this is the magic part)

Whenever you want to change your site:

1. Edit the files in your `marginalia` folder.
2. Open **GitHub Desktop**, type a short summary (e.g. `Changed the homepage`),
   click **Commit to main**, then **Push origin** (top button).
3. That's it. Vercel automatically notices and rebuilds your live site within a
   couple of minutes. No extra steps.

---

## If something goes wrong

- **Site loads but I can't sign up / log in** → You most likely missed a key in
  Part 3.3, or a value has a typo/extra space. Recheck Vercel → Settings →
  Environment Variables, fix it, then redeploy (Part 3.5, step 5).
- **"Success. No rows returned" never appeared in Supabase** → Re-run the SQL
  (Part 1.3). If it complains something "already exists", that's usually fine —
  it means part of it ran already.
- **Book covers don't show** → Some books simply have no cover in the Open
  Library database; you'll see a small text placeholder instead. That's expected.
- **The build failed on Vercel (no confetti)** → Click into the deployment to read
  the red error line. Most first-time failures are a missing environment variable.
- **I'm stuck** → Copy the exact error message and ask me; I'll translate it and
  tell you the fix.

---

### Quick reference — your important values

Fill these in as you go so they're all in one place:

```
Supabase Project URL:   ____________________________________
Supabase anon key:      ____________________________________
Live site address:      ____________________________________
Database password:      ____________________________________
```
