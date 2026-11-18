do $$
begin
  if exists (select 1 from public.daily_steps) or exists (select 1 from public.activities)
     or exists (select 1 from public.trackers) or exists (select 1 from public.tracker_entries) then
    raise exception 'Activity or tracker tables already hold data. Stop here and tell Claude.';
  end if;
end $$;

drop table if exists public.tracker_entries, public.tracker_target_versions, public.trackers,
                     public.activities, public.daily_steps cascade;

create table public.daily_steps (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  steps integer not null check (steps between 0 and 200000),
  updated_at timestamptz not null default now(),
  primary key (owner_id, local_date)
);

create table public.activities (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  name text not null check (char_length(name) between 1 and 80),
  duration_min integer not null check (duration_min between 1 and 1440),
  kcal numeric check (kcal is null or kcal between 0 and 10000),
  created_at timestamptz not null default now()
);
create index activities_owner_date on public.activities (owner_id, local_date);

create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('counter', 'amount', 'yes_no', 'measurement')),
  unit text check (unit is null or char_length(unit) <= 20),
  step numeric check (step is null or step > 0),
  target numeric check (target is null or target > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index trackers_active_name on public.trackers (owner_id, lower(name)) where archived_at is null;

create table public.tracker_entries (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  local_date date not null,
  value numeric not null check (value >= 0 and value <= 1000000),
  created_at timestamptz not null default now()
);
create index tracker_entries_owner_date on public.tracker_entries (owner_id, local_date);

alter table public.daily_steps enable row level security;
alter table public.activities enable row level security;
alter table public.trackers enable row level security;
alter table public.tracker_entries enable row level security;

create policy "own steps" on public.daily_steps for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own activities" on public.activities for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own trackers" on public.trackers for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own tracker entries" on public.tracker_entries for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.trackers t where t.id = tracker_id and t.owner_id = auth.uid()));
