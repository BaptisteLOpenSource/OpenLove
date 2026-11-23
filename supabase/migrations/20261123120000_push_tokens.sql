-- FCM tokens (ADR 0004). Service role only: registration goes through the API, never PostgREST.
-- token is globally unique so the other Partenaire cannot claim it (S6).
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('web', 'android')),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

revoke all on public.push_tokens from anon, authenticated;
