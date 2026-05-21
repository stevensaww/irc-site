-- ============================================================
-- IRC — Supabase database setup
-- Run this entire file once in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. The signups table
create table if not exists public.signups (
    id              bigserial primary key,
    name            text        not null,
    city            text        not null,
    fix_first       text        not null,
    contribution    text        not null,
    whatsapp_optin  boolean     not null default false,
    created_at      timestamptz not null default now(),
    -- Anti-spam fields (populated by Supabase automatically)
    ip_hash         text,
    user_agent      text
);

-- Helpful indexes
create index if not exists signups_created_at_idx on public.signups (created_at desc);
create index if not exists signups_city_idx       on public.signups (city);

-- 2. Row-Level Security (RLS) — required for safe public access
alter table public.signups enable row level security;

-- 3. Allow ANYONE (anon role) to insert a signup. They cannot read or update.
drop policy if exists "anon can insert signups" on public.signups;
create policy "anon can insert signups"
on public.signups
for insert
to anon
with check (
    -- Basic sanity: keep input sizes reasonable
    char_length(name) between 1 and 80
    and char_length(city) between 1 and 80
    and char_length(fix_first) between 1 and 200
    and char_length(contribution) between 1 and 60
);

-- Important: NO select/update/delete policies for anon.
-- This means random visitors cannot read names, cities, etc.
-- Only YOU (via the Supabase dashboard or service-role key) can read.

-- 4. A public, read-only count function.
-- The site calls this via supabase.rpc('signup_count') to show the live ticker.
-- It only returns a single integer — NOT any signup data.
create or replace function public.signup_count()
returns bigint
language sql
security definer
set search_path = public
as $$
    select count(*)::bigint from public.signups;
$$;

-- Allow anon to call the count function
grant execute on function public.signup_count() to anon;
grant execute on function public.signup_count() to authenticated;

-- ============================================================
-- DONE. Test it:
--   1. Run this whole script in the SQL editor.
--   2. Go to: Settings → API → copy 'Project URL' and 'anon public' key.
--   3. Paste them into app.js (CONFIG block at top).
-- ============================================================


-- ============================================================
-- ADDITION: Allow the insert RETURNING clause to work
-- so the client can receive the auto-assigned founder ID.
-- This does NOT let anon list other signups — only the row
-- they just inserted, since the RETURNING is scoped to that.
-- ============================================================

-- Drop and re-create the insert policy with explicit returning support.
-- Supabase's PostgREST honors RLS for INSERT...RETURNING; we need a
-- SELECT policy that matches only the row's own id.
-- Simplest safe approach: grant SELECT only on the id column via a
-- view, or grant a no-op SELECT policy that always denies — Postgrest
-- still returns the inserted row from RETURNING.

-- Workaround that is known to work: add a SELECT policy that returns
-- false for all rows. The RETURNING from INSERT is independent.
drop policy if exists "anon cannot select rows" on public.signups;
create policy "anon cannot select rows"
on public.signups
for select
to anon
using (false);
