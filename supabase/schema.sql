-- Touchline profiles. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Each signed-in person can read and write only their own row.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  answers     jsonb,                       -- the four questions (function, location, organisation, level)
  saved       jsonb not null default '{}', -- saved roles: { jobId: { title, company, url, location, at } }
  hidden      jsonb not null default '{}', -- hidden roles, same shape
  watch       jsonb not null default '[]', -- watched company names
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "delete own profile" on public.profiles;

create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "delete own profile" on public.profiles for delete using (auth.uid() = id);
