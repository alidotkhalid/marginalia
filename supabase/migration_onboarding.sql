-- ---------------------------------------------------------------------------
-- Onboarding: remember whether a reader has been through the welcome flow.
--
-- New accounts land on /welcome to set a name, avatar, bio and current read.
-- Everyone who already has an account is treated as done, so nobody is sent
-- back through setup.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- Existing readers skip the welcome flow.
update public.profiles
   set onboarded_at = now()
 where onboarded_at is null;
