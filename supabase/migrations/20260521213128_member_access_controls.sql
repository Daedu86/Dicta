-- Member access controls for invite-only Dicta accounts.
-- Admins keep full access. Members default to no OpenRouter access and 15 sessions.

alter table public.dicta_app_profiles
add column if not exists can_access_openrouter boolean not null default false;

alter table public.dicta_app_profiles
add column if not exists session_limit integer default 15;

alter table public.dicta_app_profiles
drop constraint if exists dicta_app_profiles_session_limit_check;

alter table public.dicta_app_profiles
add constraint dicta_app_profiles_session_limit_check
check (session_limit is null or session_limit >= 0);

update public.dicta_app_profiles
set can_access_openrouter = true,
    session_limit = null,
    updated_at = now()
where role = 'admin';

update public.dicta_app_profiles
set can_access_openrouter = false,
    session_limit = coalesce(session_limit, 15),
    updated_at = now()
where role = 'member';

comment on column public.dicta_app_profiles.can_access_openrouter is
'Allows a non-admin Dicta profile to use OpenRouter generation routes.';

comment on column public.dicta_app_profiles.session_limit is
'Maximum number of visible dictation sessions a member can create. Null is reserved for admin/unlimited profiles.';

-- Do not let members self-edit permission/quota columns through the exposed client.
-- Admin changes go through /api/admin/users with the server-only service role key.
drop policy if exists "dicta profiles own update" on public.dicta_app_profiles;

create or replace function dicta_private.dicta_sync_item_write_allowed(
  target_profile_id text,
  target_item_type text,
  target_item_key text,
  target_payload jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, dicta_private
as $$
declare
  member_session_limit integer;
  active_session_count integer;
begin
  if dicta_private.dicta_is_admin() then
    return true;
  end if;

  if target_profile_id <> dicta_private.dicta_user_profile_id() then
    return false;
  end if;

  if target_item_type <> 'session' then
    return true;
  end if;

  if coalesce(target_payload->>'deleted', 'false') = 'true' then
    return true;
  end if;

  select profile.session_limit
  into member_session_limit
  from public.dicta_app_profiles profile
  where profile.user_id = auth.uid()
    and profile.active = true
    and profile.role = 'member'
  limit 1;

  if member_session_limit is null then
    return false;
  end if;

  if exists (
    select 1
    from public.dicta_sync_items existing
    where existing.profile_id = target_profile_id
      and existing.item_type = 'session'
      and existing.item_key = target_item_key
      and coalesce(existing.payload->>'deleted', 'false') <> 'true'
  ) then
    return true;
  end if;

  select count(*)
  into active_session_count
  from public.dicta_sync_items existing
  where existing.profile_id = target_profile_id
    and existing.item_type = 'session'
    and coalesce(existing.payload->>'deleted', 'false') <> 'true';

  return active_session_count < member_session_limit;
end;
$$;

grant execute on function dicta_private.dicta_sync_item_write_allowed(text, text, text, jsonb) to authenticated;

create or replace function dicta_private.dicta_enforce_member_session_limit()
returns trigger
language plpgsql
security definer
set search_path = public, dicta_private
as $$
declare
  owner_role text;
  owner_session_limit integer;
  active_session_count integer;
begin
  if new.item_type <> 'session' then
    return new;
  end if;

  if coalesce(new.payload->>'deleted', 'false') = 'true' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.profile_id = new.profile_id
      and old.item_type = 'session'
      and old.item_key = new.item_key
      and coalesce(old.payload->>'deleted', 'false') <> 'true'
    then
      return new;
    end if;
  end if;

  select profile.role, profile.session_limit
  into owner_role, owner_session_limit
  from public.dicta_app_profiles profile
  where profile.profile_id = new.profile_id
    and profile.active = true
  limit 1;

  if owner_role = 'admin' then
    return new;
  end if;

  if owner_role <> 'member' or owner_session_limit is null then
    raise exception 'Dicta member session limit is not configured. Contact the admin.' using errcode = '42501';
  end if;

  select count(*)
  into active_session_count
  from public.dicta_sync_items existing
  where existing.profile_id = new.profile_id
    and existing.item_type = 'session'
    and coalesce(existing.payload->>'deleted', 'false') <> 'true';

  if active_session_count > owner_session_limit then
    raise exception 'Dicta member session limit reached (%/%). Contact the admin.', active_session_count, owner_session_limit
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists dicta_enforce_member_session_limit on public.dicta_sync_items;
create trigger dicta_enforce_member_session_limit
after insert or update of profile_id, item_type, item_key, payload
on public.dicta_sync_items
for each row
execute function dicta_private.dicta_enforce_member_session_limit();

drop policy if exists "dicta authenticated profile insert" on public.dicta_sync_items;
create policy "dicta authenticated profile insert"
on public.dicta_sync_items
for insert
to authenticated
with check (
  (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin())
  and dicta_private.dicta_sync_item_write_allowed(profile_id, item_type, item_key, payload)
);

drop policy if exists "dicta authenticated profile update" on public.dicta_sync_items;
create policy "dicta authenticated profile update"
on public.dicta_sync_items
for update
to authenticated
using (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin())
with check (
  (profile_id = dicta_private.dicta_user_profile_id() or dicta_private.dicta_is_admin())
  and dicta_private.dicta_sync_item_write_allowed(profile_id, item_type, item_key, payload)
);
