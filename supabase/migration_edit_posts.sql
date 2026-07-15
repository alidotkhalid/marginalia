-- ============================================================================
-- Migration: allow authors to edit their own posts.
-- Run ONCE in the Supabase SQL Editor. Deleting already works via the existing
-- delete policy; this adds the missing UPDATE policy.
-- ============================================================================

drop policy if exists "users update their own posts" on public.posts;
create policy "users update their own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
