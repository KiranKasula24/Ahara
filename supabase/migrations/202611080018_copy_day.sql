-- Copies one day's entries to another empty day in a single transaction.
create or replace function public.copy_day(source_date date, target_date date)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz_name text;
  copied integer := 0;
  src record;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if source_date = target_date then
    raise exception 'Choose a different day to copy from.' using errcode = '22023';
  end if;
  if exists (select 1 from food_logs where owner_id = uid and local_date = target_date) then
    raise exception 'That day already has entries.' using errcode = '22023';
  end if;

  select timezone into tz_name from profiles where id = uid;
  tz_name := coalesce(tz_name, 'Asia/Kolkata');

  for src in
    select * from food_logs where owner_id = uid and local_date = source_date order by consumed_at
  loop
    new_id := gen_random_uuid();
    insert into food_logs (id, owner_id, consumed_at, local_date, meal_type, food_id, quantity, unit,
                           name_snapshot, serving_name_snapshot, source_kind, notes)
    values (new_id, uid,
            (target_date + (src.consumed_at at time zone tz_name)::time) at time zone tz_name,
            target_date, src.meal_type, src.food_id, src.quantity, src.unit,
            src.name_snapshot, src.serving_name_snapshot, src.source_kind, src.notes);

    insert into food_log_nutrients (log_id, base_snapshot, final_totals, completeness)
      select new_id, base_snapshot, final_totals, completeness from food_log_nutrients where log_id = src.id;

    insert into food_log_adjustments (log_id, kind, accuracy_class, label, nutrient_changes, assumption, note,
                                      position, basis, scales_with_quantity)
      select new_id, kind, accuracy_class, label, nutrient_changes, assumption, note,
             position, basis, scales_with_quantity
      from food_log_adjustments where log_id = src.id;

    insert into food_log_tags (log_id, tag, source)
      select new_id, tag, source from food_log_tags where log_id = src.id;

    copied := copied + 1;
  end loop;
  return copied;
end
$$;
