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
- Intentionally hidden: adjustments, tags, barcode, activity, trackers, insights, offline/PWA. Their backend/UI is not complete and no placeholder destination is shown.

## Phases 8–13 foundation

- Added migrations for tags, packaged products/barcodes, activity/steps, trackers, aggregate indexes, and sync audit records.
- Added authenticated APIs for tags, activity, tracker creation/entries, insights aggregates, JSON export, and account deletion (the latter requires the server-only service-role key at deployment).
- Added an install manifest, deterministic queue deduplication, and an empty real-device performance record template. Activity, barcode, tracker, insight, export, and deletion screens remain unshipped until their complete UI and end-to-end checks are added.

## UI shell expansion

The primary navigation now exposes actual Today, Add, Activity, Insights, and Profile screens. Activity saves manual steps through the authenticated API; Insights loads the real week aggregate and labels unlogged days honestly. Barcode, tracker, adjustment, export, account deletion, and offline-replay screens still require final UI integration and end-to-end hosted-Supabase verification.
