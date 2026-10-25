-- Phase 5: search and log-query support. Catalogue values remain immutable reference data.
create index if not exists foods_canonical_name_search_idx on public.foods using gin (to_tsvector('simple', canonical_name));
create index if not exists food_aliases_lower_alias_idx on public.food_aliases (lower(alias));
create index if not exists food_logs_owner_meal_date_idx on public.food_logs(owner_id, local_date, meal_type, consumed_at);
