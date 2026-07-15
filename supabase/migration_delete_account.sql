-- ============================================================================
-- Migration: let a signed-in user delete their own account.
-- Run ONCE in the Supabase SQL Editor.
--
-- Deleting the auth.users row cascades to public.profiles (FK on delete cascade),
-- which in turn cascades to that user's posts, comments, follows, blocks and
-- read-shelf. A SECURITY DEFINER function is used because normal users cannot
-- delete from the auth schema directly; the function runs with owner rights and
-- only ever removes the *calling* user (auth.uid()).
-- ============================================================================

create or replace function public.delete_current_user()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
