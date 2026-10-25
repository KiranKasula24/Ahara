-- Closes integrity gaps discovered while completing phases 0–7.
-- Local-date authority belongs to the profile timezone, never to client input.
create or replace function public.set_food_log_local_date() returns trigger language plpgsql security definer set search_path = public as $$
declare profile_timezone text;
begin
  select timezone into profile_timezone from public.profiles where id = new.owner_id;
  new.local_date := (new.consumed_at at time zone coalesce(profile_timezone, 'Asia/Kolkata'))::date;
  return new;
end;
$$;
drop trigger if exists food_logs_set_local_date on public.food_logs;
create trigger food_logs_set_local_date before insert or update of consumed_at, owner_id on public.food_logs for each row execute function public.set_food_log_local_date();

create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists auth_user_profile on auth.users;
create trigger auth_user_profile after insert on auth.users for each row execute function public.create_profile_for_user();

create or replace function public.prevent_snapshot_rewrite() returns trigger language plpgsql as $$
begin
  if new.snapshot_version <= old.snapshot_version then
    raise exception 'A snapshot correction must increase snapshot_version';
  end if;
  return new;
end;
$$;
drop trigger if exists food_log_snapshot_version_guard on public.food_log_nutrients;
create trigger food_log_snapshot_version_guard before update on public.food_log_nutrients for each row execute function public.prevent_snapshot_rewrite();

alter table public.food_nutrients add constraint food_nutrients_nonnegative check (
  (kcal is null or kcal >= 0) and (protein_g is null or protein_g >= 0) and
  (carbs_g is null or carbs_g >= 0) and (fat_g is null or fat_g >= 0) and
  (sat_fat_g is null or sat_fat_g >= 0) and (fibre_g is null or fibre_g >= 0) and
  (free_sugars_g is null or free_sugars_g >= 0) and (total_sugars_g is null or total_sugars_g >= 0) and
  (sodium_mg is null or sodium_mg >= 0)
);

create table public.user_portions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade, name text not null,
  grams numeric not null check (grams > 0), created_at timestamptz not null default now(), unique(owner_id, food_id, name)
);
alter table public.user_portions enable row level security;
create policy "portions own rows" on public.user_portions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
