create table public.reveals (
  id bigint generated always as identity primary key,
  couple_id uuid not null references public.couples on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('surprise', 'letter')),
  title_enc text not null check (char_length(title_enc) <= 2000),
  body_enc text not null check (char_length(body_enc) <= 22000),
  reveal_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index reveals_couple_reveal_at_idx on public.reveals (couple_id, reveal_at);

alter table public.reveals enable row level security;

-- Unrevealed rows of the other Partenaire stay invisible: reveal_at vs DB clock.
create policy "partners read revealed or own reveals" on public.reveals
  for select to authenticated
  using (
    couple_id = (select private.my_couple_id())
    and (author_id = (select auth.uid()) or reveal_at <= now())
  );

create policy "partners write own future reveals" on public.reveals
  for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and author_id = (select auth.uid())
    and reveal_at > now()
  );

revoke all on public.reveals from anon, authenticated;
grant select, insert on public.reveals to authenticated;

-- Placeholders of the partner's pending reveals: never title nor body.
create or replace function public.pending_reveals()
returns table (id bigint, kind text, author_id uuid, reveal_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.kind, r.author_id, r.reveal_at
  from public.reveals r
  where r.couple_id = private.my_couple_id()
    and r.author_id <> auth.uid()
    and r.reveal_at > now()
$$;

revoke all on function public.pending_reveals() from public, anon;
grant execute on function public.pending_reveals() to authenticated;
