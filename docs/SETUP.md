# Ahara setup (phases 0–3)

1. Install Node.js 20+ and Docker Desktop. Install the Supabase CLI if you prefer it for local development.
2. Run `npm install`, then copy `.env.example` to `.env.local`. Browser code uses only the two `NEXT_PUBLIC_` variables; `SUPABASE_SERVICE_ROLE_KEY` is for the importer only.
3. Apply the SQL migrations to a disposable local Supabase/Postgres project. `npm run test:db` does this automatically in a disposable Postgres 16 Docker container once Docker is running.
4. Place the real workbook at `data/source/Anuvaad_INDB_2024.11.xlsx`. This directory is gitignored. Copy the reviewed aliases into `data/aliases/telugu_names.csv`; do not treat the draft file as verified.
5. Run `npm run import:indb -- --file data/source/Anuvaad_INDB_2024.11.xlsx --dry-run`. Review the JSON and Markdown reports in `data/output/`. Published values are never modified.
6. Only after review, run the same command with `--apply`, then use the server-only loader with the service-role key to write the catalogue.

Run the full phase 0–3 verification suite with `npm run lint`, `npm run typecheck`, `npm test`, `npm run contrast`, `npm run test:db`, and `npm run build`.
