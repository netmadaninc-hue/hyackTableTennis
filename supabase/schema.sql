create table if not exists public.tournament_state (
  id text primary key default 'current',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.tournament_state enable row level security;

drop policy if exists "Anyone can view tournament state" on public.tournament_state;
create policy "Anyone can view tournament state"
  on public.tournament_state for select
  using (true);

drop policy if exists "Admins can create tournament state" on public.tournament_state;
create policy "Admins can create tournament state"
  on public.tournament_state for insert
  to authenticated
  with check (auth.uid() = updated_by);

drop policy if exists "Admins can update tournament state" on public.tournament_state;
create policy "Admins can update tournament state"
  on public.tournament_state for update
  to authenticated
  using (auth.uid() = updated_by)
  with check (auth.uid() = updated_by);

drop policy if exists "Admins can delete tournament state" on public.tournament_state;
create policy "Admins can delete tournament state"
  on public.tournament_state for delete
  to authenticated
  using (true);

alter table public.tournament_state replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tournament_state;
exception
  when duplicate_object then null;
end;
$$;
