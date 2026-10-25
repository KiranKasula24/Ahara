# Applying the Ahara schema in Supabase

Run these files in the Supabase SQL editor, in this exact order. Run each file once, wait for a successful result, then continue to the next one:

1. `supabase/migrations/202610240001_m1_foundation.sql`
2. `supabase/migrations/202610240002_catalogue_import_idempotency.sql`
3. `supabase/migrations/202610240003_m2_m3.sql`
4. `supabase/migrations/202610240004_m2_m3_completion.sql`
5. `supabase/migrations/202610250005_phase_0_to_7_integrity.sql`
6. `supabase/migrations/202610250006_phase_4_profile.sql`
7. `supabase/migrations/202610250007_phase_5_search_logging.sql`
8. `supabase/migrations/202610250008_phase_6_own_foods.sql`
9. `supabase/migrations/202610250009_phase_7_adjustments.sql`
10. `supabase/migrations/202610250010_phase_8_tags.sql`
11. `supabase/migrations/202610250011_phase_9_products.sql`
12. `supabase/migrations/202610250012_phase_10_activity.sql`
13. `supabase/migrations/202610250013_phase_11_trackers.sql`
14. `supabase/migrations/202610250014_phase_12_insights.sql`
15. `supabase/migrations/202610250015_phase_13_audit.sql`

Run the migrations in this order. Migration 005 adds the log-local-date and frozen-snapshot triggers required before food logging; migrations 006–007 support the Phase 4–5 app.

Afterward, load the INDB catalogue with the service-role import script. Do not put a service-role key in client-side code. The app uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the browser.

To verify row-level security manually, create two test users. Logged in as user A, create a custom food and a food log. Logged in as user B, selecting `foods`, `food_logs`, `food_log_nutrients`, `food_log_adjustments`, `food_log_tags`, `favourite_foods`, `my_versions`, and `goal_versions` through the Data API must not return or modify A's private rows. Shared catalogue foods remain readable but not client-writable.
