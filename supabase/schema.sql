create table if not exists public.pet_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pet_state enable row level security;

drop policy if exists "pet_state_select_own" on public.pet_state;
drop policy if exists "pet_state_insert_own" on public.pet_state;
drop policy if exists "pet_state_update_own" on public.pet_state;
drop policy if exists "pet_state_delete_own" on public.pet_state;

create policy "pet_state_select_own" on public.pet_state
  for select to authenticated using (auth.uid() = user_id);

create policy "pet_state_insert_own" on public.pet_state
  for insert to authenticated with check (auth.uid() = user_id);

create policy "pet_state_update_own" on public.pet_state
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "pet_state_delete_own" on public.pet_state
  for delete to authenticated using (auth.uid() = user_id);
