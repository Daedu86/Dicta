-- Keep Dicta session tombstones strict: only JSON boolean deleted=true is a tombstone.
-- String values such as {"deleted":"true"} are rejected instead of being counted
-- differently by SQL policies and the TypeScript sync client.

create or replace function dicta_private.dicta_sync_payload_deleted(target_payload jsonb)
returns boolean
language sql
immutable
set search_path = public, dicta_private
as $$
  select coalesce(target_payload @> '{"deleted": true}'::jsonb, false);
$$;

create or replace function dicta_private.dicta_sync_payload_has_malformed_deleted(target_payload jsonb)
returns boolean
language sql
immutable
set search_path = public, dicta_private
as $$
  select coalesce(target_payload ? 'deleted' and jsonb_typeof(target_payload->'deleted') <> 'boolean', false);
$$;

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
  if target_item_type = 'session' and dicta_private.dicta_sync_payload_has_malformed_deleted(target_payload) then
    return false;
  end if;

  if dicta_private.dicta_is_admin() then
    return true;
  end if;

  if target_profile_id <> dicta_private.dicta_user_profile_id() then
    return false;
  end if;

  if target_item_type <> 'session' then
    return true;
  end if;

  if dicta_private.dicta_sync_payload_deleted(target_payload) then
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
      and not dicta_private.dicta_sync_payload_deleted(existing.payload)
  ) then
    return true;
  end if;

  select count(*)
  into active_session_count
  from public.dicta_sync_items existing
  where existing.profile_id = target_profile_id
    and existing.item_type = 'session'
    and not dicta_private.dicta_sync_payload_deleted(existing.payload);

  return active_session_count < member_session_limit;
end;
$$;

grant execute on function dicta_private.dicta_sync_payload_deleted(jsonb) to authenticated;
grant execute on function dicta_private.dicta_sync_payload_has_malformed_deleted(jsonb) to authenticated;
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

  if dicta_private.dicta_sync_payload_has_malformed_deleted(new.payload) then
    raise exception 'Dicta session tombstone deleted flag must be boolean.' using errcode = '22023';
  end if;

  if dicta_private.dicta_sync_payload_deleted(new.payload) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.profile_id = new.profile_id
      and old.item_type = 'session'
      and old.item_key = new.item_key
      and not dicta_private.dicta_sync_payload_deleted(old.payload)
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
    and not dicta_private.dicta_sync_payload_deleted(existing.payload);

  if active_session_count > owner_session_limit then
    raise exception 'Dicta member session limit reached (%/%). Contact the admin.', active_session_count, owner_session_limit
      using errcode = '42501';
  end if;

  return new;
end;
$$;
