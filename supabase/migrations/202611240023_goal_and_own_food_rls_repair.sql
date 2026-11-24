-- Repair migration for deployments that applied the original M2/M3 schema
-- but missed the later activity-goal and personal-food policy updates.

-- GoalSetupForm writes both daily food and daily activity energy targets.
alter table public.goal_versions drop constraint if exists goal_versions_kind_check;
alter table public.goal_versions add constraint goal_versions_kind_check
  check (kind in ('intake_kcal', 'activity_kcal'));

create unique index if not exists goal_versions_one_current_kind_idx
  on public.goal_versions(owner_id, kind)
  where ends_at is null;

-- A person may create child records only for a food they own. Recreate these
-- policies explicitly because older installations may have only read policies.
drop policy if exists "private food aliases owner write" on public.food_aliases;
create policy "private food aliases owner write" on public.food_aliases
  for all to authenticated
  using (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()));

drop policy if exists "private servings owner write" on public.food_servings;
create policy "private servings owner write" on public.food_servings
  for all to authenticated
  using (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()));

drop policy if exists "private nutrients owner write" on public.food_nutrients;
create policy "private nutrients owner write" on public.food_nutrients
  for all to authenticated
  using (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()));
