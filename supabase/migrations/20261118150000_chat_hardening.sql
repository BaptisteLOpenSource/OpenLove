-- Review follow-ups on the chat slice.

-- Couple topic only. RLS cannot pin the event name of a client broadcast (event column unset),
-- so a partner may send any event on own topic: at worst an extra refetch, no cross-couple leak.
drop policy "couple sends typing on its topic" on realtime.messages;
create policy "couple sends typing on its topic" on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and realtime.topic() = 'couple:' || (select private.my_couple_id())::text
  );

-- Trigger functions run from triggers only; nobody calls them directly.
revoke all on function private.messages_signal() from public, anon;
revoke all on function private.message_reads_signal() from public, anon;

-- No-op marks (same id) do not write, so no read signal is sent.
create or replace function public.mark_message_read()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid := private.my_couple_id();
  v_last bigint;
begin
  if v_couple is null or auth.uid() is null then
    raise exception 'not a couple member' using errcode = '42501';
  end if;
  select max(id) into v_last from public.messages where couple_id = v_couple;
  if v_last is null then
    return null;
  end if;
  insert into public.message_reads (couple_id, partner_id, last_read_id)
  values (v_couple, auth.uid(), v_last)
  on conflict (couple_id, partner_id) do update
    set last_read_id = excluded.last_read_id
    where excluded.last_read_id > public.message_reads.last_read_id;
  return v_last;
end;
$$;
