-- Token stored as sha256 hex, never plaintext. Service role only, no policy.
create table public.couple_invites (
  token_hash text primary key,
  couple_id uuid not null unique references public.couples on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.couple_invites enable row level security;
revoke all on public.couple_invites from anon, authenticated;

-- Public so PostgREST rpc sees it; execute restricted to service role below.
create function public.add_partner_b(p_user_id uuid, p_couple_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and role = 'partner_b'
  ) then
    return null;
  end if;
  insert into public.couple_members (user_id, couple_id, role)
  values (p_user_id, p_couple_id, 'partner_b');
  return p_couple_id;
end;
$$;

revoke all on function public.add_partner_b(uuid, uuid) from public, anon, authenticated;
grant execute on function public.add_partner_b(uuid, uuid) to service_role;
