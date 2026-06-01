-- Dicta durable OpenRouter job setup.
-- Run this in the Supabase SQL editor before enabling durable mobile generation.
-- Jobs are accessed only by server routes using SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.dicta_openrouter_jobs (
  profile_id text not null,
  job_id text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  request jsonb not null,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (profile_id, job_id)
);

alter table public.dicta_openrouter_jobs enable row level security;

create index if not exists dicta_openrouter_jobs_profile_updated_idx
on public.dicta_openrouter_jobs (profile_id, updated_at desc);

create table if not exists public.dicta_rate_limits (
  scope text not null,
  identifier_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, identifier_hash, window_start)
);

alter table public.dicta_rate_limits enable row level security;

create index if not exists dicta_rate_limits_updated_idx
on public.dicta_rate_limits (updated_at desc);

create or replace function public.dicta_check_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := lower(trim(coalesce(p_scope, '')));
  v_identifier_hash text := lower(trim(coalesce(p_identifier_hash, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 10000));
  v_window_seconds integer := greatest(60, least(coalesce(p_window_seconds, 3600), 86400));
  v_window_start timestamptz;
  v_request_count integer;
begin
  if v_scope !~ '^[a-z0-9:_-]{1,80}$' then
    raise exception 'Invalid rate limit scope';
  end if;

  if v_identifier_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate limit identifier hash';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds);

  insert into public.dicta_rate_limits (scope, identifier_hash, window_start, request_count, updated_at)
  values (v_scope, v_identifier_hash, v_window_start, 1, now())
  on conflict (scope, identifier_hash, window_start)
  do update set
    request_count = public.dicta_rate_limits.request_count + 1,
    updated_at = now()
  returning public.dicta_rate_limits.request_count into v_request_count;

  delete from public.dicta_rate_limits
  where updated_at < now() - interval '2 days';

  return query select
    v_request_count <= v_limit,
    v_request_count,
    greatest(0, v_limit - v_request_count),
    v_window_start + make_interval(secs => v_window_seconds);
end;
$$;
