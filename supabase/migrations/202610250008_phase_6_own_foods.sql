-- Phase 6: private portions, favourites, and a durable provenance note for user-entered foods.
alter table public.foods add column if not exists user_note text;
alter table public.foods add constraint foods_user_note_only_private check (user_note is null or owner_id is not null);

create index if not exists foods_owner_created_idx on public.foods(owner_id, created_at desc) where owner_id is not null;
create index if not exists food_logs_owner_food_recent_idx on public.food_logs(owner_id, food_id, consumed_at desc);
