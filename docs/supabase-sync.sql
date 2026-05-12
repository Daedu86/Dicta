-- Dicta single-profile Supabase sync setup.
-- Run this in the Supabase SQL editor, then add the matching Vite env vars
-- to local .env.local and Vercel Project Settings.

create table if not exists public.dicta_sync_items (
  profile_id text not null,
  item_type text not null check (item_type in ('session', 'benchmark', 'feedback')),
  item_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_type, item_key)
);

alter table public.dicta_sync_items enable row level security;

-- Replace this literal with the exact VITE_SUPABASE_SYNC_PROFILE_ID value.
-- This keeps the v1 app single-profile without adding Supabase Auth UI.
drop policy if exists "dicta single profile read" on public.dicta_sync_items;
create policy "dicta single profile read"
on public.dicta_sync_items
for select
to anon
using (profile_id = 'replace-with-your-profile-id');

drop policy if exists "dicta single profile insert" on public.dicta_sync_items;
create policy "dicta single profile insert"
on public.dicta_sync_items
for insert
to anon
with check (profile_id = 'replace-with-your-profile-id');

drop policy if exists "dicta single profile update" on public.dicta_sync_items;
create policy "dicta single profile update"
on public.dicta_sync_items
for update
to anon
using (profile_id = 'replace-with-your-profile-id')
with check (profile_id = 'replace-with-your-profile-id');

create index if not exists dicta_sync_items_profile_updated_idx
on public.dicta_sync_items (profile_id, updated_at desc);
