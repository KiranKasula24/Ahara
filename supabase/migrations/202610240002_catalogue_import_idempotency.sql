-- The source record is the stable identity of a normalised reference food.
-- This makes repeat imports update the existing catalogue rather than duplicate it.
alter table public.foods add constraint foods_source_record_unique unique (source_record_id);

-- The importer runs with the service role; client users still cannot modify shared rows.
alter table public.source_records enable row level security;
create policy "shared source records readable" on public.source_records for select using (true);
