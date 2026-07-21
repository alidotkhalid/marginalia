-- ---------------------------------------------------------------------------
-- Read-only security verification. Changes nothing.
--
-- Paste the whole file into Supabase → SQL Editor → Run. Every row should read
-- PASS. Anything marked FAIL points at a migration that did not apply.
-- ---------------------------------------------------------------------------

-- 1. Row level security is on for every table we own -------------------------
select
  'RLS enabled: ' || c.relname as check,
  case when c.relrowsecurity then 'PASS' else 'FAIL' end as result
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','books','posts','follows','read_books','comments','drafts',
    'asks','saves','comment_votes','tag_follows','rooms','room_participants',
    'room_invites','activity_days','mentions'
  )

union all

-- 2. Every table actually has at least one policy ----------------------------
select
  'Has policies: ' || t.tablename,
  case when count(p.policyname) > 0 then 'PASS' else 'FAIL' end
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.tablename in (
    'profiles','books','posts','follows','read_books','comments','drafts',
    'asks','saves','comment_votes','tag_follows','rooms','room_participants',
    'room_invites','activity_days','mentions'
  )
group by t.tablename

union all

-- 3. The privacy-critical policies are the corrected ones --------------------
select
  'Private shelves hidden',
  case when exists (
    select 1 from pg_policies
    where tablename = 'read_books' and policyname = 'read shelves visible per privacy'
  ) then 'PASS' else 'FAIL (run migration_privacy_audit2)' end

union all
select
  'Follow graph hidden',
  case when exists (
    select 1 from pg_policies
    where tablename = 'follows' and policyname = 'follows visible per privacy'
  ) then 'PASS' else 'FAIL (run migration_privacy_audit2)' end

union all
select
  'Old open follows policy removed',
  case when not exists (
    select 1 from pg_policies
    where tablename = 'follows' and policyname = 'follows are viewable by everyone'
  ) then 'PASS' else 'FAIL' end

union all
select
  'Room takeover closed',
  case when exists (
    select 1 from pg_policies
    where tablename = 'rooms' and policyname = 'participants update the room timer'
  ) then 'PASS' else 'FAIL (run migration_security_audit3)' end

union all

-- 4. Rooms: only the timer column is updatable by clients --------------------
select
  'Rooms: only timer_ends_at updatable',
  case when (
    select count(*) from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'rooms'
      and privilege_type = 'UPDATE' and grantee = 'authenticated'
      and column_name <> 'timer_ends_at'
  ) = 0 then 'PASS' else 'FAIL (run migration_security_audit3)' end

union all

-- 5. The functions the app depends on exist ----------------------------------
select
  'Function: ' || f.fn,
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f.fn
  ) then 'PASS' else 'FAIL' end
from (values
  ('can_see_profile'), ('is_profile_public'), ('is_accepted_follower'),
  ('has_blocked'), ('reading_streak'), ('unseen_notifications'),
  ('profile_counts'), ('cleanup_stale_rooms'), ('mark_notifications_seen'),
  ('delete_current_user'), ('freeze_username'), ('user_day')
) as f(fn)

union all

-- 6. Rate-limit and integrity triggers are attached --------------------------
select
  'Trigger: ' || t.tg,
  case when exists (
    select 1 from pg_trigger where tgname = t.tg and not tgisinternal
  ) then 'PASS' else 'FAIL' end
from (values
  ('posts_rate_limit'), ('comments_rate_limit'), ('rooms_rate_limit'),
  ('invites_rate_limit'), ('asks_rate_limit'), ('follows_rate_limit'),
  ('drafts_cap'), ('books_rate_limit'), ('profiles_freeze_username'),
  ('on_comment_mentions'), ('on_post_activity')
) as t(tg)

union all

-- 7. Internal helpers are not exposed to clients -----------------------------
select
  'mark_active not client-callable',
  case when not has_function_privilege('authenticated', 'public.mark_active(uuid)', 'execute')
    then 'PASS' else 'FAIL (run migration_security_audit)' end

order by 2 desc, 1;
