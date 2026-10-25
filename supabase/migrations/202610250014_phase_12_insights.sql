create index if not exists food_logs_owner_local_date_idx on public.food_logs(owner_id,local_date);
create index if not exists food_log_nutrients_log_idx on public.food_log_nutrients(log_id);
create index if not exists activities_owner_local_date_idx on public.activities(owner_id,local_date);
