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

-- ---------------------------------------------------------------- Questions & answers
-- One table for both: a question has no parent_id, an answer points at its question.
-- Everyone can read; only signed-in people can post, and only as themselves; people can delete their own posts.
create table if not exists public.qa_posts (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.qa_posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author      text not null check (char_length(author) between 1 and 60),
  body        text not null check (char_length(body) between 3 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists qa_posts_parent_idx on public.qa_posts (parent_id, created_at);

alter table public.qa_posts enable row level security;

drop policy if exists "anyone can read q&a"      on public.qa_posts;
drop policy if exists "post as yourself"         on public.qa_posts;
drop policy if exists "delete your own posts"    on public.qa_posts;

create policy "anyone can read q&a"   on public.qa_posts for select using (true);
create policy "post as yourself"      on public.qa_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "delete your own posts" on public.qa_posts for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- API access
-- New Supabase projects may not expose new tables to the API automatically. Grant exactly what the site needs;
-- the row-level security policies above still decide which rows each person can touch.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.qa_posts to anon, authenticated;
grant insert, delete on public.qa_posts to authenticated;
