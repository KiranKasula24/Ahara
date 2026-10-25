# Ahara

M0–M1 foundation for an India-first personal nutrition tracker. It contains a strict TypeScript Next.js app, visual tokens/component primitives, Supabase schema with RLS, deterministic nutrition calculations, and an INDB audit importer.

## Local setup

1. Install Node 20+ and Docker, then install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).
2. Run `npm install`, copy `.env.example` to `.env.local`, and fill the public Supabase URL/key.
3. Run `supabase start` then `supabase db reset` to apply `supabase/migrations` locally.
4. Put `Anuvaad_INDB_2024.11.xlsx` in `data/source/` and the verified/draft Telugu alias CSV in `data/aliases/telugu_names.csv`. Source workbooks and generated audit output remain out of git.
5. Run `npm run import:indb -- --file data/source/Anuvaad_INDB_2024.11.xlsx`. This writes `data/output/indb-validation-report.json` and a normalized staging file. Review flags; never auto-correct source nutrition values.

## Verification

Run `npm run contrast`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, and `npm run build`.

## Data and security notes

The migration enables RLS on all user-owned M1 tables. Shared foods are read-only to clients; user foods and logs are restricted to `auth.uid()`. Importing the shared catalogue must run through a server-side/admin process; do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
