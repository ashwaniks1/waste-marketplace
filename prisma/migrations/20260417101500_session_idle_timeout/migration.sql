-- Add app-level idle session tracking + configurable timeout.

alter table if exists public.users
  add column if not exists last_activity_at timestamptz not null default now();

alter table if exists public.platform_settings
  add column if not exists session_idle_minutes integer not null default 60;

