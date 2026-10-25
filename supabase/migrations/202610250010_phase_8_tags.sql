-- Phase 8: constrain the current supported tag vocabulary while retaining future user-defined tags.
alter table public.food_log_tags add constraint food_log_tags_source_nonempty check (source in ('auto', 'user'));
create index if not exists food_log_tags_tag_idx on public.food_log_tags(tag);
