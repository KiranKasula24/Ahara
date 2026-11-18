-- Own foods can be archived (hidden from search) without touching past entries.
alter table public.foods add column if not exists archived_at timestamptz;
create index if not exists foods_owner_active_idx on public.foods(owner_id) where archived_at is null;

-- Same ranked search as before, now skipping archived foods.
create or replace function public.search_foods(q text, max_results integer default 30)
returns table (
  found_food_id uuid,
  match_rank integer,
  matched_alias text,
  match_quality public.alias_quality,
  alias_verified boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with cleaned as (
    select lower(trim(q)) as term,
           replace(replace(replace(lower(trim(q)), '\', '\\'), '%', '\%'), '_', '\_') as pattern
  ),
  hits as (
    select a.food_id,
           a.alias,
           a.match_quality as quality,
           a.verified,
           f.owner_id,
           case
             when lower(a.alias) = c.term then 1
             when lower(a.alias) like c.pattern || '%' then 2
             when lower(a.alias) like '% ' || c.pattern || '%' then 3
             else 4
           end as rank_value
    from cleaned c
    join public.food_aliases a on length(c.term) >= 2 and lower(a.alias) like '%' || c.pattern || '%'
    join public.foods f on f.id = a.food_id and f.archived_at is null
  ),
  best as (
    select distinct on (food_id) *
    from hits
    order by food_id, rank_value, verified desc, length(alias)
  )
  select b.food_id, b.rank_value, b.alias, b.quality, b.verified
  from best b
  order by b.rank_value, (b.owner_id is null), length(b.alias), b.alias
  limit least(greatest(max_results, 1), 50);
$$;
