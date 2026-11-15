-- Rank Distribution: database schema for Supabase.
--
-- Run this once in the Supabase dashboard:
--   SQL Editor → New query → paste this whole file → Run.
-- It is safe to run again; it only creates what is missing.
--
-- Then make yourself an admin (see the last section of this file).
--
-- Security model, enforced here by row-level security (RLS) and not by the
-- website's code:
--   * Anyone can read seasons and their datapoints (the site needs them).
--   * Anyone can add a submission with a proof screenshot, but only as
--     "pending", and cannot read submissions or screenshots back.
--   * Only users listed in the `admins` table can read submissions or change
--     anything.

-- ---------------------------------------------------------------- Tables

create table if not exists public.seasons (
  id          text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  year        int  not null,
  number      int  not null,
  name        text not null check (char_length(name) between 1 and 60),
  -- Which curve is fitted to the season's datapoints: an id from src/lib/model/buildSeasonModel.js.
  model       text not null default 'normal',
  -- Which ladder the season was played on: an id from src/data/ladder.js.
  ladder      text not null default 'emerald',
  -- Where the season is in the site's header: in the "Older Seasons" menu, or (false) a tab of its own.
  older       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- For a database made before seasons had a ladder.
alter table public.seasons add column if not exists ladder text not null default 'emerald';
-- For a database made before seasons could be moved into the "Older Seasons" menu.
alter table public.seasons add column if not exists older boolean not null default false;

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  season_id    text not null references public.seasons (id) on delete cascade,
  rank         text not null check (rank ~ '^[A-Za-z]{3,20} [1-5]$'),
  -- The exact SR within that rank, from the rank progress on the screenshot. Null if only the rank is known.
  sr           int check (sr between 0 and 5000),
  -- The role the rank is held in, as read off the screenshot. Null if it could not be read.
  role         text check (role in ('tank', 'damage', 'support')),
  better_than  numeric not null check (better_than > 0 and better_than < 100),
  -- File name of the proof screenshot in the private "proofs" storage bucket.
  proof_path   text not null check (proof_path ~ '^[0-9a-f-]{36}[.](webp|jpg)$'),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

-- For a database made before submissions carried an exact SR.
alter table public.submissions add column if not exists sr int check (sr between 0 and 5000);
-- For a database made before submissions carried a role.
alter table public.submissions add column if not exists role text check (role in ('tank', 'damage', 'support'));

-- A datapoint says: a player at this rank (or exact SR) is better than X% of players.
create table if not exists public.datapoints (
  id             uuid primary key default gen_random_uuid(),
  season_id      text not null references public.seasons (id) on delete cascade,
  rank           text,
  sr             int check (sr between 0 and 5000),
  better_than    numeric not null check (better_than > 0 and better_than < 100),
  -- The role the figure is for: an id from src/data/roles.js.
  role           text not null check (role in ('tank', 'damage', 'support')),
  weight         numeric not null default 1 check (weight > 0),
  note           text check (char_length(note) <= 300),
  submission_id  uuid references public.submissions (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- exactly one of rank / sr
  check ((rank is null) <> (sr is null))
);

-- For a database made before datapoints carried a role. This runs once, when the column is added.
-- Every datapoint the database then held for 2026 Season 5 came from a tank's rank screen. The
-- other seasons' were a mix of the three roles with no record of which was which, so each is
-- given one of the three at random.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'datapoints' and column_name = 'role'
  ) then
    alter table public.datapoints add column role text check (role in ('tank', 'damage', 'support'));
    update public.datapoints
    set role = case
      when season_id = '2026-season-5' then 'tank'
      else (array['tank', 'damage', 'support'])[1 + floor(random() * 3)::int]
    end;
    alter table public.datapoints alter column role set not null;
  end if;
end;
$$;

create index if not exists datapoints_season_idx  on public.datapoints (season_id);
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

-- Who is an admin. Nobody can read or write this table through the API;
-- rows are added from the SQL editor (see the end of this file).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ------------------------------------------------------------- Functions

-- True when the signed-in user is an admin. Runs with the owner's rights so
-- it can look at the admins table, which is otherwise closed.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Approving a submission adds it to the season's datapoints and marks it
-- approved, in one transaction. The datapoint's role is the one the admin
-- chose (point_role), or else the one read off the screenshot.
--
-- The function used to take two arguments; that one is removed so there is
-- only ever one to call.
drop function if exists public.approve_submission(uuid, numeric);

create or replace function public.approve_submission(
  submission uuid,
  point_weight numeric default 1,
  point_role text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  pending public.submissions;
  held_in text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can approve submissions.';
  end if;

  select * into pending
  from public.submissions
  where id = submission and status = 'pending'
  for update;

  if not found then
    raise exception 'That submission was already reviewed.';
  end if;

  held_in := coalesce(point_role, pending.role);
  if held_in is null then
    raise exception 'Choose the role this rank is held in before approving it.';
  end if;

  -- A submission with an exact SR becomes a datapoint at that SR; otherwise at the start of its rank.
  if pending.sr is not null then
    insert into public.datapoints (season_id, sr, better_than, role, weight, note, submission_id)
    values (pending.season_id, pending.sr, pending.better_than, held_in, point_weight,
            'Community submission (' || pending.rank || ')', pending.id);
  else
    insert into public.datapoints (season_id, rank, better_than, role, weight, note, submission_id)
    values (pending.season_id, pending.rank, pending.better_than, held_in, point_weight,
            'Community submission', pending.id);
  end if;

  update public.submissions
  set status = 'approved', reviewed_at = now()
  where id = pending.id;
end;
$$;

-- Stops the review queue being flooded: no new submissions while 500 are waiting.
create or replace function public.limit_pending_submissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.submissions where status = 'pending') >= 500 then
    raise exception 'The review queue is full. Please try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_pending_submissions on public.submissions;
create trigger limit_pending_submissions
  before insert on public.submissions
  for each row execute function public.limit_pending_submissions();

-- ----------------------------------------------------------- Permissions

alter table public.seasons     enable row level security;
alter table public.datapoints  enable row level security;
alter table public.submissions enable row level security;
alter table public.admins      enable row level security;

revoke all on public.seasons, public.datapoints, public.submissions, public.admins from anon, authenticated;

grant select on public.seasons, public.datapoints to anon, authenticated;
grant insert, update, delete on public.seasons, public.datapoints to authenticated;

-- Visitors may only set these six columns; status always starts as 'pending'.
grant insert (season_id, rank, sr, role, better_than, proof_path) on public.submissions to anon, authenticated;
grant select, update, delete on public.submissions to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.approve_submission(uuid, numeric, text) to authenticated;

drop policy if exists "Anyone can read seasons"        on public.seasons;
drop policy if exists "Admins manage seasons"          on public.seasons;
drop policy if exists "Anyone can read datapoints"     on public.datapoints;
drop policy if exists "Admins manage datapoints"       on public.datapoints;
drop policy if exists "Anyone can submit a datapoint"  on public.submissions;
drop policy if exists "Admins review submissions"      on public.submissions;

create policy "Anyone can read seasons" on public.seasons
  for select using (true);
create policy "Admins manage seasons" on public.seasons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can read datapoints" on public.datapoints
  for select using (true);
create policy "Admins manage datapoints" on public.datapoints
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can submit a datapoint" on public.submissions
  for insert to anon, authenticated
  with check (status = 'pending' and reviewed_at is null);
create policy "Admins review submissions" on public.submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------- Proof screenshots
--
-- A private storage bucket: visitors can add an image to it, only admins can
-- look at or delete one. Images are capped at 2 MB (the site shrinks them
-- well below that before uploading).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload a proof" on storage.objects;
drop policy if exists "Admins can view proofs"    on storage.objects;
drop policy if exists "Admins can delete proofs"  on storage.objects;

create policy "Anyone can upload a proof" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'proofs');
create policy "Admins can view proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and public.is_admin());
create policy "Admins can delete proofs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'proofs' and public.is_admin());

-- ------------------------------------------------------------- Seed data

insert into public.seasons (id, year, number, name)
values ('2026-season-5', 2026, 5, '2026: Season 5')
on conflict (id) do nothing;

insert into public.datapoints (season_id, rank, better_than, role)
select '2026-season-5', seed.rank, seed.better_than, 'tank'
from (values ('Master 3', 97), ('Master 2', 98)) as seed (rank, better_than)
where not exists (select 1 from public.datapoints where season_id = '2026-season-5');

-- ------------------------------------------------------ Become the admin
--
-- 1. In the dashboard: Authentication → Users → Add user → Create new user.
--    Enter your email and a strong password, and tick "Auto Confirm User".
--    This email and password are what you type at /#/admin on the site.
-- 2. Run this, with your email, in the SQL editor:
--
--      insert into public.admins (user_id)
--      select id from auth.users where email = 'you@example.com';
--
-- 3. Recommended: Authentication → Sign In / Providers → turn off
--    "Allow new users to sign up". (Signing up would not make anyone an
--    admin, but there is no reason to allow it.)
