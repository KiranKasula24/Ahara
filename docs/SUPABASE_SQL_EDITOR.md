# Applying the Ahara schema in Supabase

Run these files in the Supabase SQL editor, in this exact order. Run each file once, wait for a successful result, then continue to the next one:

1. `supabase/migrations/202610240001_m1_foundation.sql`
2. `supabase/migrations/202610240002_catalogue_import_idempotency.sql`
3. `supabase/migrations/202610240003_m2_m3.sql`
4. `supabase/migrations/202610240004_m2_m3_completion.sql`

Do not run migration 004 before the preceding migrations: it adds tables, indexes, and constraints to their tables.

Afterward, load the INDB catalogue with the service-role import script. Do not put a service-role key in client-side code. The app uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the browser.

To verify row-level security manually, create two test users. Logged in as user A, create a custom food and a food log. Logged in as user B, selecting `foods`, `food_logs`, `food_log_nutrients`, `food_log_adjustments`, `food_log_tags`, `favourite_foods`, `my_versions`, and `goal_versions` through the Data API must not return or modify A's private rows. Shared catalogue foods remain readable but not client-writable.
