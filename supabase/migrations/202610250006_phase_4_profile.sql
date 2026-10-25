alter table public.profiles add column if not exists display_name text;

-- A profile may set its own timezone; food-log local dates are recalculated by the phase-2 trigger.
alter table public.profiles add constraint profiles_timezone_nonempty check (length(trim(timezone)) > 0);
