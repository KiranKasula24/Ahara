create table public.sync_audit (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, entity_type text not null, entity_id uuid not null, winning_updated_at timestamptz not null, losing_payload jsonb, created_at timestamptz not null default now());
alter table public.sync_audit enable row level security;
create policy "sync audit own rows" on public.sync_audit for select using(owner_id=auth.uid());
