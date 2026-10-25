import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const container = "ahara-phase-test-db";
const password = "ahara-local-test-only";
function docker(args: string[], input?: string, allowFailure = false): string {
  const result = spawnSync("docker", args, { encoding: "utf8", input });
  if (result.error || (result.status !== 0 && !allowFailure)) throw new Error(result.error?.message ?? result.stderr ?? "Docker command failed");
  return result.stdout;
}
async function main() {
  try { docker(["version", "--format", "{{.Server.Version}}"]); }
  catch { console.error("Database tests were not run: Docker is unavailable. Install/start Docker Desktop, then run npm run test:db."); process.exitCode = 1; return; }
  try {
    docker(["rm", "-f", container], undefined, true);
    docker(["run", "-d", "--rm", "--name", container, "-e", `POSTGRES_PASSWORD=${password}`, "-e", "POSTGRES_DB=ahara_phase_test", "postgres:16-alpine"]);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres", "-d", "ahara_phase_test"], { encoding: "utf8" }).status === 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (attempt === 29) throw new Error("Postgres did not become ready");
    }
    const bootstrap = "create schema auth; create table auth.users (id uuid primary key, email text); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create role authenticated; grant usage on schema public to authenticated; alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;";
    docker(["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "ahara_phase_test"], bootstrap);
    const migrationsPath = path.join(process.cwd(), "supabase", "migrations");
    const migrations = (await readdir(migrationsPath)).filter((name) => name.endsWith(".sql")).sort();
    for (const migration of migrations) docker(["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "ahara_phase_test"], await readFile(path.join(migrationsPath, migration), "utf8"));
    docker(["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "ahara_phase_test"], await readFile(path.join(process.cwd(), "supabase", "tests", "phase_0_to_3.sql"), "utf8"));
    console.log(`Database tests passed against disposable Postgres 16 (${migrations.length} migrations applied).`);
  } finally { docker(["rm", "-f", container], undefined, true); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
