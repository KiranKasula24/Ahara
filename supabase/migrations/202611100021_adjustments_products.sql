-- 1. Replace an entry's adjustments and its final totals in one transaction.
create or replace function public.replace_log_adjustments(
  p_log_id uuid, p_adjustments jsonb, p_final_totals jsonb, p_completeness jsonb
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare new_version integer;
begin
  select snapshot_version + 1 into new_version from food_log_nutrients where log_id = p_log_id;
  if new_version is null then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;
  delete from food_log_adjustments where log_id = p_log_id;
  insert into food_log_adjustments
    (log_id, kind, accuracy_class, label, nutrient_changes, assumption, position, basis, scales_with_quantity, snapshot_version)
  select p_log_id, a->>'kind', a->>'accuracy_class', a->>'label', coalesce(a->'nutrient_changes', '{}'::jsonb),
         a->>'assumption', (ord - 1)::int, coalesce(a->>'basis', 'per_entry'),
         coalesce((a->>'scales_with_quantity')::boolean, false), new_version
  from jsonb_array_elements(p_adjustments) with ordinality as t(a, ord);
  update food_log_nutrients
     set final_totals = p_final_totals, completeness = p_completeness, snapshot_version = new_version
   where log_id = p_log_id;
  return new_version;
end
$$;

-- 2. People may save packaged products and barcodes for foods they own.
create policy "own product details write" on public.product_details for all
  using (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()));

create policy "own product barcodes write" on public.product_barcodes for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.foods f where f.id = food_id and f.owner_id = auth.uid()));
