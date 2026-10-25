-- Run after 202610240001_m1_foundation.sql through 202610240003_m2_m3.sql.
-- Safe additions required by the completed M2/M3 client flows.

create table if not exists public.favourite_foods (
  owner_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, food_id)
);

alter table public.favourite_foods enable row level security;
create policy "favourites own rows" on public.favourite_foods
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- The snapshot is intentionally append-only from the client perspective. Corrections replace it
-- only with an explicit higher version, preserving the fact that a historical log was corrected.
alter table public.food_log_nutrients
  add constraint food_log_nutrients_complete_shape
  check (jsonb_typeof(base_snapshot) = 'object' and jsonb_typeof(final_totals) = 'object' and jsonb_typeof(completeness) = 'object');

create index if not exists favourite_foods_owner_created_idx on public.favourite_foods(owner_id, created_at desc);
create index if not exists food_logs_owner_consumed_idx on public.food_logs(owner_id, consumed_at desc);

-- A My Version must be private and its name is unique per user, so search can reliably surface it.
create unique index if not exists my_versions_owner_name_unique on public.my_versions(owner_id, lower(name));
