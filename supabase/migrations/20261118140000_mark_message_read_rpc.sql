-- Clients never write message_reads: the id is computed server side and never goes backward.
drop policy "partners write own read" on public.message_reads;
drop policy "partners update own read" on public.message_reads;
revoke insert, update on public.message_reads from authenticated;

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
    set last_read_id = greatest(public.message_reads.last_read_id, excluded.last_read_id);
  return v_last;
end;
$$;

revoke all on function public.mark_message_read() from public, anon;
grant execute on function public.mark_message_read() to authenticated;
