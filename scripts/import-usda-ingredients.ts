import fs from "node:fs/promises";

// Phase 7 accepts a user-supplied USDA export. It deliberately refuses to invent ingredient nutrition values.
async function main() {
  const index = process.argv.indexOf("--file"); const file = index >= 0 ? process.argv[index + 1] : undefined;
  if (!file) throw new Error("Provide a USDA export with --file. No ingredient data is seeded without provenance.");
  const raw = await fs.readFile(file, "utf8"); const rows = JSON.parse(raw) as unknown[];
  if (!Array.isArray(rows) || !rows.length) throw new Error("Expected a non-empty JSON USDA export.");
  console.log(`Validated ${rows.length} supplied USDA ingredient rows. Load them only through a server-side import with their source IDs and provenance.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
