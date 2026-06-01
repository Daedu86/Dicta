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
