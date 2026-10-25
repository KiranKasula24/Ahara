create table public.goal_versions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, kind text not null check(kind='intake_kcal'), value numeric not null check(value>0), starts_at date not null, ends_at date, created_at timestamptz not null default now());
create table public.food_log_adjustments (id uuid primary key default gen_random_uuid(), log_id uuid not null references public.food_logs(id) on delete cascade, kind text not null check(kind in ('measured_ingredient','estimate_preset','percent_of_base','manual_delta','set_unknown_value')), accuracy_class text not null check(accuracy_class in ('measured','estimate','manual')), label text not null, nutrient_changes jsonb not null default '{}', assumption text, note text, position integer not null default 0, basis text not null default 'per_entry' check(basis in ('per_entry','per_unit')), scales_with_quantity boolean not null default false);
create table public.my_versions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, base_food_id uuid not null references public.foods(id), name text not null, adjustments jsonb not null default '[]', created_at timestamptz not null default now());
create table public.food_log_tags (log_id uuid not null references public.food_logs(id) on delete cascade, tag text not null, source text not null check(source in ('auto','user')), primary key(log_id,tag));
alter table public.food_logs add column if not exists is_favourite boolean not null default false;
alter table public.food_logs enable row level security; alter table public.goal_versions enable row level security; alter table public.food_log_adjustments enable row level security; alter table public.my_versions enable row level security; alter table public.food_log_tags enable row level security;
create policy "goals own rows" on public.goal_versions for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "versions own rows" on public.my_versions for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "adjustments owned log" on public.food_log_adjustments for all using(exists(select 1 from public.food_logs l where l.id=log_id and l.owner_id=auth.uid())) with check(exists(select 1 from public.food_logs l where l.id=log_id and l.owner_id=auth.uid()));
create policy "tags owned log" on public.food_log_tags for all using(exists(select 1 from public.food_logs l where l.id=log_id and l.owner_id=auth.uid())) with check(exists(select 1 from public.food_logs l where l.id=log_id and l.owner_id=auth.uid()));

-- M2/M3 client writes are permitted only through a food owned by the caller.
create policy "private food aliases owner write" on public.food_aliases for all using (exists(select 1 from public.foods f where f.id=food_id and f.owner_id=auth.uid())) with check (exists(select 1 from public.foods f where f.id=food_id and f.owner_id=auth.uid()));
create policy "private servings owner write" on public.food_servings for all using (exists(select 1 from public.foods f where f.id=food_id and f.owner_id=auth.uid())) with check (exists(select 1 from public.foods f where f.id=food_id and f.owner_id=auth.uid()));
create policy "private nutrients owner write" on public.food_nutrients for all using (exists(select 1 from public.foods f where f.id=food_id and f.owner_id=auth.uid())) with check (exists(select 1 from public.foods f where f.id=food_id and f.owner_id=auth.uid()));

create table public.adjustment_presets (
  id uuid primary key default gen_random_uuid(), label text not null, accuracy_class text not null check(accuracy_class in ('measured','estimate')),
  applies_to jsonb not null default '{}', nutrient_rules jsonb not null, assumption text not null,
  basis text not null check(basis in ('ingredient_calculation','sibling_record')), source_id uuid references public.data_sources(id), active boolean not null default true
);
alter table public.adjustment_presets enable row level security;
create policy "adjustment presets readable" on public.adjustment_presets for select using (true);

-- A version belongs to exactly one owner and retains its base + serialized frozen adjustments.
create index my_versions_owner_name_idx on public.my_versions(owner_id, lower(name));
create index food_log_adjustments_log_position_idx on public.food_log_adjustments(log_id, position);
create index food_log_tags_log_idx on public.food_log_tags(log_id);
