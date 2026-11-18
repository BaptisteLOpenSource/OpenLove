-- Role lives in app_metadata (JWT claim, server-written). Users cannot edit it.
create or replace function private.sync_role_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', new.role)
      where id = new.user_id;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.user_id is distinct from old.user_id) then
    update auth.users
      set raw_app_meta_data = raw_app_meta_data - 'role'
      where id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.sync_role_claim() from public, anon, authenticated;
grant execute on function private.sync_role_claim() to service_role;

create trigger couple_members_role_claim
  after insert or update or delete on public.couple_members
  for each row execute function private.sync_role_claim();

-- Backfill existing accounts, and strip any role claim not backed by a membership.
update auth.users u
  set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', m.role)
  from public.couple_members m
  where m.user_id = u.id;

update auth.users u
  set raw_app_meta_data = u.raw_app_meta_data - 'role'
  where u.raw_app_meta_data ? 'role'
    and not exists (select 1 from public.couple_members m where m.user_id = u.id);
