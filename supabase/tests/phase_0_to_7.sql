begin;
-- Run under the Supabase test runner after migrations. This file is intentionally a SQL test plan
-- for cross-user access, replay IDs, snapshot guards, and timezone local dates.
-- It must be executed against a disposable local database with auth fixtures; no hosted data.
rollback;
