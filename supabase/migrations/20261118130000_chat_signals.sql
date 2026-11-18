-- Signals carry ids only, never body_enc (ADR 0001). Clients refetch /api/messages.
create or replace function private.messages_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id::text),
    'message',
    'couple:' || new.couple_id::text,
    true
  );
  return new;
end;
$$;

create trigger messages_signal
  after insert on public.messages
  for each row execute function private.messages_signal();

create or replace function private.message_reads_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.last_read_id::text),
    'read',
    'couple:' || new.couple_id::text,
    true
  );
  return new;
end;
$$;

create trigger message_reads_signal
  after insert or update on public.message_reads
  for each row execute function private.message_reads_signal();

-- Private channel: only the couple's own topic, for receive and for typing broadcasts.
create policy "couple receives its chat signals" on realtime.messages
  for select to authenticated
  using (realtime.topic() = 'couple:' || (select private.my_couple_id())::text);

create policy "couple sends typing on its topic" on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and realtime.topic() = 'couple:' || (select private.my_couple_id())::text
  );
