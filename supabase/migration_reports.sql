-- ---------------------------------------------------------------------------
-- Reports: let readers flag a read or a comment as objectionable.
--
-- Required by the App Store (Guideline 1.2) for any app with user-generated
-- content: there must be a way to report, and the operator must be able to act.
-- Reports are private to the reporter and to you (reviewed in the Supabase
-- dashboard). Acting on one means hiding or deleting the read/comment and, if
-- needed, the account.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  -- Exactly one of post_id / comment_id is set.
  post_id      uuid references public.posts (id) on delete cascade,
  comment_id   uuid references public.comments (id) on delete cascade,
  reason       text not null check (char_length(reason) between 1 and 500),
  created_at   timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);

-- One report per reader per item, so a reporter cannot flood the queue.
create unique index if not exists reports_one_per_post
  on public.reports (reporter_id, post_id) where post_id is not null;
create unique index if not exists reports_one_per_comment
  on public.reports (reporter_id, comment_id) where comment_id is not null;

create index if not exists reports_created_idx
  on public.reports (created_at desc);

alter table public.reports enable row level security;

-- A reader may file reports as themselves, and see only their own.
drop policy if exists "readers file reports" on public.reports;
create policy "readers file reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reporters see their reports" on public.reports;
create policy "reporters see their reports"
  on public.reports for select
  using (reporter_id = auth.uid());

-- Rate limit: 20 reports an hour is plenty for a real person.
create or replace function public.enforce_report_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reports
       where reporter_id = new.reporter_id
         and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'You have filed a lot of reports. Try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_report_rate();
