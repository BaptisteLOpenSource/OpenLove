create table public.message_reads (
  couple_id uuid not null references public.couples on delete cascade,
  partner_id uuid not null references auth.users on delete cascade,
  last_read_id bigint not null,
  primary key (couple_id, partner_id)
);

alter table public.message_reads enable row level security;

create policy "partners read reads" on public.message_reads
  for select to authenticated
  using (couple_id = (select private.my_couple_id()));

create policy "partners write own read" on public.message_reads
  for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and partner_id = (select auth.uid())
  );

create policy "partners update own read" on public.message_reads
  for update to authenticated
  using (partner_id = (select auth.uid()))
  with check (
    couple_id = (select private.my_couple_id())
    and partner_id = (select auth.uid())
  );

revoke all on public.message_reads from anon, authenticated;
grant select, insert, update on public.message_reads to authenticated;
