import crypto from "node:crypto";

export type Row = Record<string, unknown>;
export type ServingMode = "count" | "household" | "grams_only";
export type NormalizedRow = { source_code: string; raw_row: Row; checksum: string; canonical_name: string; aliases: string[]; variant_group: string; serving_mode: ServingMode; serving_unit: string | null; derived_serving_grams: number | null; nutrients: Record<string, { value: number | null; unit: string }>; flags: string[] };
export const thresholds = { energyKcalMax: 900, macroEnergyPercent: 0.15, macroEnergyAbsolute: 10, kjKcal: 4.184, kjKcalTolerance: 0.01, servingConsistency: 0.1, suspiciousZeroEnergy: 150 };

export function numberOrNull(row: Row, key: string): number | null { const value = row[key]; if (value === undefined || value === null || value === "") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
export function text(row: Row, key: string): string { return String(row[key] ?? "").trim(); }
export function splitName(name: string): { canonical: string; aliases: string[] } { const match = name.match(/^([^()]+?)(?:\s*\((.+)\))?$/); return { canonical: (match?.[1] ?? name).trim(), aliases: (match?.[2] ?? "").split(/[\/;|]/).map((item) => item.trim()).filter(Boolean) }; }
export function classify(unit: string, countUnits: Set<string>): ServingMode { const normalized = unit.trim().toLowerCase(); return !normalized ? "grams_only" : countUnits.has(normalized) ? "count" : "household"; }
export function variantGroup(name: string, overrides: Record<string, string> = {}): string { return overrides[name.toLowerCase()] ?? (name.toLowerCase().replace(/\b(vegetable|plain|with|and|instant|semolina|moong|bean|masala)\b/g, "").replace(/\s+/g, " ").trim() || name.toLowerCase()); }

function sourceValue(row: Row, ...keys: string[]): number | null { for (const key of keys) { const value = numberOrNull(row, key); if (value !== null) return value; } return null; }
export function nutrientsFor(row: Row): NormalizedRow["nutrients"] {
  const core: Record<string, { value: number | null; unit: string }> = {
    kcal: { value: sourceValue(row, "energy_kcal", "kcal"), unit: "kcal" }, protein_g: { value: sourceValue(row, "protein_g"), unit: "g" }, carbs_g: { value: sourceValue(row, "carb_g", "carbs_g"), unit: "g" }, fat_g: { value: sourceValue(row, "fat_g"), unit: "g" }, sat_fat_g: { value: sourceValue(row, "sfa_g") ?? (sourceValue(row, "sfa_mg") === null ? null : sourceValue(row, "sfa_mg")! / 1000), unit: "g" }, free_sugars_g: { value: sourceValue(row, "freesugar_g"), unit: "g" }, fibre_g: { value: sourceValue(row, "fibre_g", "fiber_g"), unit: "g" }, sodium_mg: { value: sourceValue(row, "sodium_mg"), unit: "mg" }, mono_fat_g: { value: sourceValue(row, "mufa_g") ?? (sourceValue(row, "mufa_mg") === null ? null : sourceValue(row, "mufa_mg")! / 1000), unit: "g" }, poly_fat_g: { value: sourceValue(row, "pufa_g") ?? (sourceValue(row, "pufa_mg") === null ? null : sourceValue(row, "pufa_mg")! / 1000), unit: "g" },
  };
  for (const [key, raw] of Object.entries(row)) if (!(key in core) && /_(mg|ug|g)$/.test(key)) core[key] = { value: raw === "" || raw === null ? null : numberOrNull(row, key), unit: key.endsWith("_ug") ? "µg" : key.endsWith("_mg") ? "mg" : "g" };
  return core;
}
export function flagsFor(row: Row): string[] {
  const flags: string[] = []; const kcal = sourceValue(row, "energy_kcal", "kcal"), kj = numberOrNull(row, "energy_kj"), carbs = sourceValue(row, "carb_g", "carbs_g"), protein = numberOrNull(row, "protein_g"), fat = numberOrNull(row, "fat_g"), fibre = sourceValue(row, "fibre_g", "fiber_g"), sugar = numberOrNull(row, "freesugar_g");
  if (Object.values(row).some((value) => typeof value === "number" && value < 0)) flags.push("negative_value");
  if (kcal !== null && kcal >= thresholds.energyKcalMax) flags.push("energy_ge_900_kcal_per_100g");
  if (carbs !== null && protein !== null && fat !== null && carbs + protein + fat > 100) flags.push("macros_over_100g");
  if (fibre !== null && carbs !== null && fibre > carbs) flags.push("fibre_over_carbs"); if (sugar !== null && carbs !== null && sugar > carbs) flags.push("free_sugars_over_carbs");
  if (kcal !== null && protein !== null && carbs !== null && fat !== null) { const simple = 4 * protein + 4 * carbs + 9 * fat; const fibreAdjusted = 4 * protein + 4 * (carbs - (fibre ?? 0)) + 2 * (fibre ?? 0) + 9 * fat; const limit = Math.max(kcal * thresholds.macroEnergyPercent, thresholds.macroEnergyAbsolute); if (Math.abs(kcal - simple) > limit) flags.push("energy_macro_simple"); if (Math.abs(kcal - fibreAdjusted) > limit) flags.push("energy_macro_fibre_adjusted"); }
  if (kcal !== null && kj !== null && Math.abs(kj / kcal - thresholds.kjKcal) / thresholds.kjKcal > thresholds.kjKcalTolerance) flags.push("kj_kcal_ratio");
  if (kcal !== null && kcal > thresholds.suspiciousZeroEnergy && (fat === 0 || protein === 0 || numberOrNull(row, "sodium_mg") === 0)) flags.push("suspicious_zero");
  return flags;
}
export function normaliseRows(rows: Row[], countUnits: Set<string>, overrides: Record<string, string> = {}): NormalizedRow[] { return rows.map((raw_row) => { const parsed = splitName(text(raw_row, "food_name")); const unit = text(raw_row, "servings_unit"); const kcal100 = sourceValue(raw_row, "energy_kcal", "kcal"); const kcalServing = sourceValue(raw_row, "energy_per_serving_kcal", "serving_energy_kcal"); const grams = kcal100 && kcalServing !== null ? (kcalServing / kcal100) * 100 : null; return { source_code: text(raw_row, "food_code"), raw_row, checksum: crypto.createHash("sha256").update(JSON.stringify(raw_row)).digest("hex"), canonical_name: parsed.canonical, aliases: parsed.aliases, variant_group: variantGroup(parsed.canonical, overrides), serving_mode: classify(unit, countUnits), serving_unit: unit || null, derived_serving_grams: grams, nutrients: nutrientsFor(raw_row), flags: flagsFor(raw_row) }; }); }
