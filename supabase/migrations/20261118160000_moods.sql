-- One Humeur per Partenaire per day. Upsert on (partner_id, day) replaces the earlier set of the day.
create table public.moods (
  couple_id uuid not null references public.couples on delete cascade,
  partner_id uuid not null references auth.users on delete cascade,
  day date not null,
  mood text not null check (mood in ('happy', 'calm', 'tired', 'sad', 'anxious')),
  primary key (partner_id, day)
);

create index moods_couple_day_idx on public.moods (couple_id, day);

alter table public.moods enable row level security;

create policy "partners read their couple moods" on public.moods
  for select to authenticated
  using (couple_id = (select private.my_couple_id()));

create policy "partners write their own mood" on public.moods
  for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and partner_id = (select auth.uid())
  );

create policy "partners update their own mood" on public.moods
  for update to authenticated
  using (partner_id = (select auth.uid()))
  with check (
    couple_id = (select private.my_couple_id())
    and partner_id = (select auth.uid())
  );

revoke all on public.moods from anon, authenticated;
grant select, insert, update on public.moods to authenticated;
