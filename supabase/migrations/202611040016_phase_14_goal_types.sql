-- Phase 14: versioned personal intake and activity-energy targets.
-- Activity stays separate from food intake; this never creates a net-calorie value.
alter table public.goal_versions drop constraint if exists goal_versions_kind_check;
alter table public.goal_versions add constraint goal_versions_kind_check check (kind in ('intake_kcal', 'activity_kcal'));

create unique index if not exists goal_versions_one_current_kind_idx
  on public.goal_versions(owner_id, kind)
  where ends_at is null;
