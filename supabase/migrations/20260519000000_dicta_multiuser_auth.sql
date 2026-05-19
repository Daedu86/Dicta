-- Dicta multiuser auth/RLS migration.
-- Before running, create your Supabase Auth admin user and replace
-- replace-with-current-admin-user-id / replace-with-current-profile-id below.

create table if not exists public.dicta_app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'member')) default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dicta_app_profiles enable row level security;

create schema if not exists dicta_private;

create or replace function dicta_private.dicta_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, dicta_private
as $$
  select exists (
    select 1
    from public.dicta_app_profiles profile
    where profile.user_id = auth.uid()
      and profile.role = 'admin'
      and profile.active = true
  );
$$;

create or replace function dicta_private.dicta_user_profile_id()
returns text
language sql
stable
security definer
set search_path = public, dicta_private
as $$
  select profile.profile_id
  from public.dicta_app_profiles profile
  where profile.user_id = auth.uid()
    and profile.active = true
  limit 1;
$$;

grant usage on schema dicta_private to authenticated;
grant execute on function dicta_private.dicta_is_admin() to authenticated;
grant execute on function dicta_private.dicta_user_profile_id() to authenticated;

drop policy if exists "dicta profiles own read" on public.dicta_app_profiles;
create policy "dicta profiles own read"
on public.dicta_app_profiles
for select
to authenticated
using (user_id = auth.uid() or dicta_private.dicta_is_admin());

drop policy if exists "dicta profiles own update" on public.dicta_app_profiles;
create policy "dicta profiles own update"
on public.dicta_app_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and role = (select role from public.dicta_app_profiles where user_id = auth.uid()));

alter table public.dicta_sync_items enable row level security;

drop policy if exists "dicta single profile read" on public.dicta_sync_items;
drop policy if exists "dicta single profile insert" on public.dicta_sync_items;
drop policy if exists "dicta single profile update" on public.dicta_sync_items;
drop policy if exists "dicta single profile delete" on public.dicta_sync_items;

drop policy if exists "dicta authenticated profile read" on public.dicta_sync_items;
create policy "dicta authenticated profile read"
on public.dicta_sync_items
for select
to authenticated
using (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin());

drop policy if exists "dicta authenticated profile insert" on public.dicta_sync_items;
create policy "dicta authenticated profile insert"
on public.dicta_sync_items
for insert
to authenticated
with check (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin());

drop policy if exists "dicta authenticated profile update" on public.dicta_sync_items;
create policy "dicta authenticated profile update"
on public.dicta_sync_items
for update
to authenticated
using (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin())
with check (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin());

drop policy if exists "dicta authenticated profile delete" on public.dicta_sync_items;
create policy "dicta authenticated profile delete"
on public.dicta_sync_items
for delete
to authenticated
using (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin());

alter table public.dicta_openrouter_jobs enable row level security;

drop policy if exists "dicta authenticated jobs read" on public.dicta_openrouter_jobs;
create policy "dicta authenticated jobs read"
on public.dicta_openrouter_jobs
for select
to authenticated
using (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin());

-- Bootstrap row for the existing owner profile.
-- Replace both placeholders before applying to a real project.
-- insert into public.dicta_app_profiles (user_id, profile_id, display_name, role, active)
-- values ('replace-with-current-admin-user-id', 'replace-with-current-profile-id', 'Admin', 'admin', true)
-- on conflict (user_id) do update
-- set profile_id = excluded.profile_id,
--     display_name = excluded.display_name,
--     role = 'admin',
--     active = true,
--     updated_at = now();
