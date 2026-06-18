-- Dicta retention policy 20/30:
-- - active session/telemetry retention: 20 days
-- - tombstone retention: 30 days
-- - server_version supports anti-resurrection incremental sync cursors

create sequence if not exists public.dicta_sync_items_server_version_seq;

alter table public.dicta_sync_items
add column if not exists server_version bigint;

update public.dicta_sync_items
set server_version = nextval('public.dicta_sync_items_server_version_seq')
where server_version is null;

alter table public.dicta_sync_items
alter column server_version set not null;

create or replace function public.dicta_sync_items_touch_server_version()
returns trigger
language plpgsql
as $$
begin
  new.server_version := nextval('public.dicta_sync_items_server_version_seq');
  return new;
end;
$$;

drop trigger if exists dicta_sync_items_touch_server_version_trigger on public.dicta_sync_items;

create trigger dicta_sync_items_touch_server_version_trigger
before insert or update on public.dicta_sync_items
for each row
execute function public.dicta_sync_items_touch_server_version();

create index if not exists dicta_sync_items_profile_server_version_idx
on public.dicta_sync_items (profile_id, server_version);

create index if not exists dicta_sync_items_tombstone_expiry_idx
on public.dicta_sync_items (((payload->>'tombstoneExpiresAt')))
where payload->>'deleted' = 'true';

update public.dicta_sync_items
set
  payload = jsonb_build_object(
    'id', item_key,
    'deleted', true,
    'deletedAt', now(),
    'updatedAt', now(),
    'tombstoneExpiresAt', now() + interval '30 days'
  ),
  updated_at = now()
where item_type = 'session'
  and coalesce(payload->>'deleted', 'false') <> 'true'
  and coalesce(payload->>'status', '') in ('finished', 'error')
  and coalesce(
    nullif(payload #>> '{telemetry,finishedAt}', '')::timestamptz,
    nullif(payload ->> 'updatedAt', '')::timestamptz,
    nullif(payload ->> 'createdAt', '')::timestamptz
  ) < now() - interval '20 days';

delete from public.dicta_sync_items
where item_type = 'session'
  and payload->>'deleted' = 'true'
  and coalesce(
    nullif(payload->>'tombstoneExpiresAt', '')::timestamptz,
    nullif(payload->>'deletedAt', '')::timestamptz + interval '30 days'
  ) < now();
