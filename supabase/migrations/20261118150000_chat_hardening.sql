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

