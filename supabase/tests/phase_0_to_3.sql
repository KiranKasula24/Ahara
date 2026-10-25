begin;
create or replace function public.assert_true(condition boolean, message text) returns void language plpgsql as $$ begin if not condition then raise exception '%', message; end if; end; $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'b@example.test');
select public.assert_true((select timezone = 'Asia/Kolkata' from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'profile trigger did not set timezone');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
insert into public.foods (owner_id, canonical_name, kind, serving_mode, source_kind) values ('00000000-0000-0000-0000-000000000001', 'Test poha', 'custom', 'household', 'user_entered') returning id \gset
insert into public.food_logs (id, owner_id, consumed_at, local_date, meal_type, food_id, quantity, unit, name_snapshot, source_kind) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-10-25 20:00:00+00', '2000-01-01', 'dinner', :'id', 1, 'portion', 'Test poha', 'user_entered');
insert into public.food_log_nutrients (log_id, base_snapshot, final_totals, completeness) values ('10000000-0000-0000-0000-000000000001', '{"kcal":100}', '{"kcal":100}', '{}');
select public.assert_true((select local_date = date '2026-10-26' from public.food_logs where id = '10000000-0000-0000-0000-000000000001'), 'local date ignored Asia/Kolkata');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select public.assert_true(not exists(select 1 from public.food_logs where id = '10000000-0000-0000-0000-000000000001'), 'cross-user log read succeeded');
do $$ begin insert into public.food_logs (id, owner_id, consumed_at, local_date, meal_type, quantity, unit, name_snapshot, source_kind) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', now(), current_date, 'lunch', 1, 'portion', 'spoof', 'user_entered'); raise exception 'ownership spoof insert succeeded'; exception when insufficient_privilege then null; end $$;

set local role postgres;
do $$ begin update public.food_log_nutrients set final_totals = '{"kcal":101}' where log_id = '10000000-0000-0000-0000-000000000001'; raise exception 'snapshot update without a version bump succeeded'; exception when others then if position('snapshot_version' in sqlerrm) = 0 then raise; end if; end $$;
update public.food_log_nutrients set final_totals = '{"kcal":101}', snapshot_version = 2 where log_id = '10000000-0000-0000-0000-000000000001';
select public.assert_true((select snapshot_version = 2 from public.food_log_nutrients where log_id = '10000000-0000-0000-0000-000000000001'), 'versioned snapshot correction failed');
rollback;
