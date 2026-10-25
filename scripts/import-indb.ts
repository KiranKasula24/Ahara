import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { normaliseRows, thresholds, type Row } from "./import-indb/core";

const countUnits = new Set(["idli", "dosa", "chapati", "roti", "piece", "egg", "ladoo", "vada", "poori", "parantha", "biscuit", "cookie", "cutlet", "slice", "sandwich", "pesarattu"]);
async function readJson<T>(file: string, fallback: T): Promise<T> { try { return JSON.parse(await fs.readFile(file, "utf8")) as T; } catch { return fallback; } }
function csvRows(input: string): string[][] { return input.trim().split(/\r?\n/).map((line) => line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)?.map((cell) => cell.replace(/^,/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) ?? []); }
function csvCell(value: string): string { return `"${value.replace(/"/g, '""')}"`; }
async function main() {
  const args = process.argv.slice(2); const fileIndex = args.indexOf("--file"); const file = fileIndex >= 0 ? args[fileIndex + 1] : "data/source/Anuvaad_INDB_2024.11.xlsx";
  if (!args.includes("--dry-run") && !args.includes("--apply")) throw new Error("Choose --dry-run or --apply; importing never writes silently.");
  const output = args.includes("--output") ? args[args.indexOf("--output") + 1] : "data/output";
  const overrides = await readJson<Record<string, string>>("scripts/import-indb/variant-overrides.json", {});
  const workbook = XLSX.read(await fs.readFile(file)); const rows = workbook.SheetNames.flatMap((name) => XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name], { defval: null }));
  const normalized = normaliseRows(rows, countUnits, overrides); if (normalized.some((row) => !row.source_code)) throw new Error("Every source row must have food_code before import.");
  const zeroRates: Record<string, number> = {}; for (const key of Object.keys(rows[0] ?? {})) { const values = rows.map((row) => Number(row[key])).filter(Number.isFinite); if (values.length) zeroRates[key] = values.filter((value) => value === 0).length / values.length; }
  const flagged = normalized.filter((row) => row.flags.length); const flags = flagged.flatMap((row) => row.flags).reduce<Record<string, number>>((all, flag) => ({ ...all, [flag]: (all[flag] ?? 0) + 1 }), {});
  const rowsWithoutServing = rows.filter((row) => { const value = Number(row.unit_serving_energy_kcal); return !Number.isFinite(value) || value === 0; }).length;
  const report = { generated_at: new Date().toISOString(), input: path.resolve(file), mode: args.includes("--apply") ? "apply" : "dry-run", rows: rows.length, thresholds, formulas: { simple: "4*protein_g + 4*carb_g + 9*fat_g", fibre_adjusted: "4*protein_g + 4*(carb_g-fibre_g) + 2*fibre_g + 9*fat_g", energy_units: "energy_kj / energy_kcal = 4.184 ±1%" }, serving_modes: normalized.reduce<Record<string, number>>((all, row) => ({ ...all, [row.serving_mode]: (all[row.serving_mode] ?? 0) + 1 }), {}), rows_without_serving_data: rowsWithoutServing, flags, zero_rates: zeroRates, flagged_rows: flagged.map((row) => ({ source_code: row.source_code, name: row.canonical_name, reasons: row.flags })), to_check: ["idli implied serving weight", "pesarattu implied serving weight"], published_values_changed: false };
  await fs.mkdir(output, { recursive: true }); await fs.writeFile(path.join(output, "indb-normalized.json"), JSON.stringify(normalized, null, 2)); await fs.writeFile(path.join(output, "indb-validation-report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(output, "indb-validation-summary.md"), `# INDB validation\n\nRows: ${rows.length}\n\nFlagged rows: ${flagged.length}\n\nPublished values were not changed. This report records flags for review, not corrections.\n`);
  const aliasFile = await fs.access("data/aliases/telugu_names.csv").then(() => "data/aliases/telugu_names.csv").catch(() => "data/aliases/telugu_names_to_verify.csv");
  const aliases = csvRows(await fs.readFile(aliasFile, "utf8")); const header = aliases.shift() ?? [];
  const column = (name: string) => header.findIndex((cell) => cell.trim().toLowerCase().includes(name));
  const englishIndex = column("english"); const transliterationIndex = column("transliteration"); const teluguIndex = column("telugu"); const confirmedIndex = column("correct");
  const matches = aliases.map((row) => { const english = row[englishIndex] ?? ""; const candidates = normalized.filter((food) => food.canonical_name.toLowerCase().includes(english.toLowerCase()) || english.toLowerCase().includes(food.canonical_name.toLowerCase())).slice(0, 5); return [english, row[transliterationIndex] ?? "", row[teluguIndex] ?? "", row[confirmedIndex] ?? "", candidates.map((food) => `${food.source_code}: ${food.canonical_name}`).join(" | ")]; });
  await fs.writeFile(path.join(output, "alias_matches_to_review.csv"), ["english,transliteration,telugu_script,status,candidates", ...matches.map((row) => row.map(csvCell).join(","))].join("\n"));
  if (args.includes("--apply")) console.log("Normalisation completed. Run npm run load:indb to perform the service-role database write after reviewing the report.");
  else console.log(`Dry run completed: ${rows.length} source rows; ${flagged.length} flagged for review.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
