import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

type Row = Record<string, unknown>;
const config = { energyKcalMax: 900, macroEnergyPercent: .15, macroEnergyAbsolute: 10, kjKcal: 4.184, kjKcalTolerance: .01, servingConsistency: .10, suspiciousZeroEnergy: 150 };
const countUnits = new Set(["idli","dosa","chapati","roti","piece","egg","ladoo","vada","poori","parantha","biscuit","cookie","cutlet","slice","sandwich","pesarattu"]);
function n(row: Row, key: string): number | null { const value = row[key]; if (value === undefined || value === null || value === "") return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function text(row: Row, key: string): string { return String(row[key] ?? "").trim(); }
function splitName(name: string) { const match = name.match(/^([^()]+?)(?:\s*\((.+)\))?$/); return { canonical: (match?.[1] ?? name).trim(), aliases: (match?.[2] ?? "").split(/[\/;|]/).map(x => x.trim()).filter(Boolean) }; }
function classify(unit: string) { const normalized = unit.trim().toLowerCase(); return countUnits.has(normalized) ? "count" : normalized ? "household" : "grams_only"; }
function variantGroup(name: string) { return name.toLowerCase().replace(/\b(vegetable|plain|with|and|instant|semolina|moong|bean|masala)\b/g, "").replace(/\s+/g, " ").trim() || name.toLowerCase(); }
function flag(row: Row): string[] {
  const result: string[] = []; const kcal = n(row,"energy_kcal"), kj = n(row,"energy_kj"), carb = n(row,"carb_g"), protein = n(row,"protein_g"), fat = n(row,"fat_g"), fibre = n(row,"fibre_g"), sugar = n(row,"freesugar_g");
  if (Object.values(row).some(v => typeof v === "number" && v < 0)) result.push("negative_value");
  if (kcal !== null && kcal >= config.energyKcalMax) result.push("energy_ge_900_kcal_per_100g");
  if (carb !== null && protein !== null && fat !== null && carb + protein + fat > 100) result.push("macros_over_100g");
  if (fibre !== null && carb !== null && fibre > carb) result.push("fibre_over_carbs"); if (sugar !== null && carb !== null && sugar > carb) result.push("free_sugars_over_carbs");
  if (kcal !== null && protein !== null && carb !== null && fat !== null) { const expected = 4 * protein + 4 * carb + 9 * fat; if (Math.abs(kcal - expected) > Math.max(kcal * config.macroEnergyPercent, config.macroEnergyAbsolute)) result.push("energy_macro_simple"); }
  if (kcal !== null && kj !== null && Math.abs(kj / kcal - config.kjKcal) / config.kjKcal > config.kjKcalTolerance) result.push("kj_kcal_ratio");
  if (kcal !== null && kcal > config.suspiciousZeroEnergy && (fat === 0 || protein === 0 || n(row,"sodium_mg") === 0)) result.push("suspicious_zero");
  return result;
}
async function main() {
  const args = process.argv.slice(2); const fileArg = args.indexOf("--file"); const file = fileArg >= 0 ? args[fileArg + 1] : "data/source/Anuvaad_INDB_2024.11.xlsx"; const output = args.includes("--output") ? args[args.indexOf("--output") + 1] : "data/output";
  const workbook = XLSX.read(await fs.readFile(file)); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });
  const zeroRates: Record<string, number> = {}; for (const column of Object.keys(rows[0] ?? {})) { const values = rows.map(r => n(r,column)).filter((v): v is number => v !== null); if (values.length) zeroRates[column] = values.filter(v => v === 0).length / values.length; }
  const normalized = rows.map(row => { const parsed = splitName(text(row,"food_name")); const unit = text(row,"servings_unit"); return { source_code: text(row,"food_code"), raw_row: row, checksum: crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex"), canonical_name: parsed.canonical, aliases: parsed.aliases, group: variantGroup(parsed.canonical), serving_mode: classify(unit), serving_unit: unit || null, flags: flag(row) }; });
  const counts = normalized.reduce<Record<string,number>>((all,row) => { for (const item of row.flags) all[item] = (all[item] ?? 0) + 1; return all; }, {});
  const report = { generated_at: new Date().toISOString(), input: path.resolve(file), rows: rows.length, columns: Object.keys(rows[0] ?? {}).length, thresholds: config, formulas: { macro_simple: "4*protein_g + 4*carb_g + 9*fat_g", macro_fibre_variant: "4*protein_g + 4*(carb_g-fibre_g) + 2*fibre_g + 9*fat_g", kj_kcal: "energy_kj / energy_kcal, expected 4.184" }, serving_modes: normalized.reduce<Record<string,number>>((a,r) => (a[r.serving_mode] = (a[r.serving_mode] ?? 0) + 1,a),{}), flags: counts, zero_rates: zeroRates, flagged_rows: normalized.filter(r => r.flags.length).map(r => ({ source_code:r.source_code, name:r.canonical_name, flags:r.flags })), note: "Published values are reported, never corrected. This dry-run artefact is idempotent because source_code is the stable key." };
  await fs.mkdir(output,{recursive:true}); await fs.writeFile(path.join(output,"indb-validation-report.json"),JSON.stringify(report,null,2)); await fs.writeFile(path.join(output,"indb-normalized.json"),JSON.stringify(normalized,null,2));
  console.log(`Imported ${rows.length} source rows for review. ${normalized.filter(r=>r.flags.length).length} rows have review flags.`); console.log(`Report: ${path.join(output,"indb-validation-report.json")}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
