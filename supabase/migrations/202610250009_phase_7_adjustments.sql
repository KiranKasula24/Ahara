-- Phase 7: audit fields and guards for adjustments. Published reference foods remain untouched.
-- This is safe for hosted projects where the earlier phase-3 migration was not applied.
create table if not exists public.adjustment_presets (
  id uuid primary key default gen_random_uuid(), label text not null,
  accuracy_class text not null check(accuracy_class in ('measured','estimate')),
  applies_to jsonb not null default '{}', nutrient_rules jsonb not null,
  assumption text not null, basis text not null check(basis in ('ingredient_calculation','sibling_record')),
  source_id uuid references public.data_sources(id), active boolean not null default true
);
alter table public.adjustment_presets enable row level security;
drop policy if exists "adjustment presets readable" on public.adjustment_presets;
create policy "adjustment presets readable" on public.adjustment_presets for select using (true);

alter table public.food_log_adjustments add column if not exists snapshot_version integer not null default 1 check (snapshot_version > 0);
do $$ begin
  alter table public.food_log_adjustments add constraint adjustment_changes_object check (jsonb_typeof(nutrient_changes) = 'object');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.adjustment_presets add constraint adjustment_preset_has_written_basis check (length(trim(assumption)) > 0 and basis is not null);
exception when duplicate_object then null; end $$;
create index if not exists adjustment_presets_active_idx on public.adjustment_presets(active) where active;
