-- Dicta event table used by server routes.

create table if not exists public.dicta_security_events (
  id bigserial primary key,
  event_type text not null,
  profile_id text,
  role text,
  legacy boolean not null default false,
  severity text not null default 'warn' check (severity in ('info', 'warn', 'error')),
  status_code integer,
  route text,
  model text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.dicta_security_events enable row level security;

create index if not exists dicta_security_events_created_idx
on public.dicta_security_events (created_at desc);

create index if not exists dicta_security_events_profile_created_idx
on public.dicta_security_events (profile_id, created_at desc);
