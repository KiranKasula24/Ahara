# Progress

## Status review — 25 October 2026

The repository has partial work from phases 0 through 7. The furthest phase started is **Phase 7 — Adjustments and My Versions**, evidenced by the adjustment migration and early adjustment engine. It was not complete: phases 0–6 had missing fixed commands, tests, database safeguards, and user flows; phase 7 had no sourced ingredient importer, customisation UI, or My Versions flow.

## Work completed in this pass

- Phase 0: added the required `contrast` and `test:db` command names, tokens source file, and missing shared UI primitives.
- Phase 1: completed pure calculation types and rules for count, household and gram quantities, completeness states, display rounding, status tolerance, and adjustment semantics with tests.
- Phase 2: added local-date/profile/snapshot guard triggers and nutrient constraints. `npm run test:db` now creates a disposable Postgres 16 instance, applies every migration, and runs cross-user, spoofing, timezone and frozen-snapshot assertions when Docker is available.
- Phase 3: refactored importer normalisation/validation into testable code. It preserves raw records, parses aliases, classifies units, converts fatty-acid units, emits review reports and requires an explicit dry-run or apply mode.

## Still requiring an environment or source material

- Run the importer against the uncommitted INDB workbook and verified Telugu alias file.
- Start Docker and run the SQL RLS suite locally.

## Phase 4

Implemented the hosted-Supabase email magic-link screen, an authenticated Today/Profile shell, safe-area bottom navigation, date selector, profile timezone and display-name settings, and a versioned optional intake goal. Food search and logging deliberately remain unavailable until Phase 5.
- Phase 7's ingredient import needs a provided USDA export/API key. No ingredient values have been fabricated.

## UI audit — phases 0–6

- Present: mobile shell, safe-area navigation, auth, Today, Add, Profile, server-authenticated search/logging, private-food and portion APIs.
- In progress: dashboard ring treatment, full source/nutrient detail, edit affordance, and Phase-6 controls (custom food, portions, favourites, recents, re-log and copy-yesterday) need client integration.
- Implemented: adjustments, tags, barcode, activity, trackers, insights, offline/PWA, export, and account deletion flows. Hosted-Supabase and real-device verification remain release checks.

## Phases 8–13 foundation

- Added migrations for tags, packaged products/barcodes, activity/steps, trackers, aggregate indexes, and sync audit records.
- Added authenticated APIs for tags, activity, tracker creation/entries, insights aggregates, JSON export, and account deletion (the latter requires the server-only service-role key at deployment).
- Added an install manifest, deterministic offline queue deduplication, service-worker update handling, activity/tracker/insight UI, export, and account deletion flows. Complete hosted-Supabase and real-device verification remains.

## UI shell expansion

The primary navigation exposes actual Today, Add, Activity, Insights, and Profile screens. Activity saves manual steps through the authenticated API; Insights loads the real week aggregate and labels unlogged days honestly. Barcode, tracker, adjustment, export, account deletion, and offline replay are integrated; hosted-Supabase and real-device verification remain.

## Frontend route rebuild — 26 October 2026

- Replaced the single conditional client page with route-group layouts and dedicated `page.tsx` files for marketing, auth, Today, diary, add food, food catalogue/detail, recipes, activity, insights, goals, trackers, favourites, history, export, and settings subpages.
- Added a responsive obsidian/orange App Shell with pathname-aware desktop sidebar and mobile bottom navigation, shared page headers, loading/error/404 states, and an install manifest.
- Today, diary, add-food, activity, insights, login, and export call the existing authenticated Supabase/API paths. Preview data is visible only at `/today?preview=1` and is labelled as unsaved demo data.
- Routes without a verified storage/API contract remain honest capability states, so no user nutrition or history is invented.
- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run contrast` pass. The production build began but did not finish within the available command window, so it still requires a completed local run.

## UX redesign implementation — 2 November 2026

- Redesigned `/add` around food-first language, debounced cancellable search, serving-aware quantity controls, meal picker, post-save actions, and a live nutrition preview using the server-equivalent calculation rules. Missing nutrients remain unavailable rather than becoming zero.
- Redesigned `/log` as a date-navigable meal diary with subtotals and a deliberate two-step authenticated removal flow.
- Redesigned `/insights` to fetch on shared range changes and show logged-day/average summaries, a truthful calorie trend, top logged foods, and explicit activity-data limitations.
- Typecheck, lint, unit tests (25) and contrast checks pass after these changes. Hosted-Supabase end-to-end verification and a completed production build remain required before release.

## Catalogue and initial setup — 4 November 2026

- Ran the reviewed INDB loader against the hosted Supabase configuration. It completed without an error after processing the validated 1,014 source rows; the loader preserves imported source values and raw records.
- Added a Phase-14 migration and goal API for versioned intake and separate activity-energy targets, plus `/setup` onboarding and editable `/goals` UI. The new migration must be run in the hosted SQL Editor before the activity target can be saved.
- The moved project now starts the production build without the prior OneDrive `readlink` error, but the build did not complete within the available command window and remains to be verified.
