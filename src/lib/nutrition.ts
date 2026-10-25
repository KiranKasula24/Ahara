export type NutrientKey = "kcal" | "proteinG" | "carbsG" | "fatG" | "satFatG" | "fibreG" | "freeSugarsG" | "totalSugarsG" | "sodiumMg";
export type Nutrients = Record<NutrientKey, number | null>;
export type ServingBasis = "per_serving" | "per_100g";
export type FoodBasis = { basis: ServingBasis; nutrients: Nutrients };
export type AdjustmentKind = "measured_ingredient" | "estimate_preset" | "percent_of_base" | "manual_delta" | "set_unknown_value";
export type Adjustment = { kind: AdjustmentKind; label: string; changes: Partial<Record<NutrientKey, number>>; basis?: "per_entry" | "per_unit"; scalesWithQuantity?: boolean };
export type Completeness = Partial<Record<NutrientKey, { notFullyAdjusted: true; direction: "at_least" | "at_most"; reason: string }>>;

export const nutrientKeys: NutrientKey[] = ["kcal", "proteinG", "carbsG", "fatG", "satFatG", "fibreG", "freeSugarsG", "totalSugarsG", "sodiumMg"];
export function emptyNutrients(): Nutrients { return Object.fromEntries(nutrientKeys.map(k => [k, null])) as Nutrients; }
export function calculateBase(food: FoodBasis, amount: number): Nutrients {
  const multiplier = food.basis === "per_100g" ? amount / 100 : amount;
  return Object.fromEntries(nutrientKeys.map(k => [k, food.nutrients[k] === null ? null : food.nutrients[k]! * multiplier])) as Nutrients;
}
export function sumNutrients(rows: Nutrients[]): { values: Nutrients; partial: NutrientKey[] } {
  const values = emptyNutrients(); const partial: NutrientKey[] = [];
  for (const key of nutrientKeys) { const known = rows.filter(r => r[key] !== null).reduce((sum, r) => sum + r[key]!, 0); if (rows.some(r => r[key] === null)) partial.push(key); values[key] = known; }
  return { values, partial };
}
/** Applies frozen log adjustments. Amounts default to the whole entry, never silently scale. */
export function calculateAdjusted(base: Nutrients, quantity: number, adjustments: Adjustment[]): { totals: Nutrients; completeness: Completeness } {
  const totals = { ...base }; const completeness: Completeness = {};
  for (const adjustment of adjustments) for (const key of nutrientKeys) {
    const change = adjustment.changes[key]; if (change === undefined) continue;
    const current = totals[key];
    if (adjustment.kind === "set_unknown_value") { if (current === null) totals[key] = change * (adjustment.basis === "per_unit" ? quantity : 1); continue; }
    if (current === null) { completeness[key] = { notFullyAdjusted: true, direction: change < 0 ? "at_most" : "at_least", reason: adjustment.label }; continue; }
    const multiplier = adjustment.kind === "percent_of_base" || adjustment.scalesWithQuantity || adjustment.basis === "per_unit" ? quantity : 1;
    const delta = adjustment.kind === "percent_of_base" ? current * (change / 100) : change * multiplier;
    totals[key] = Math.max(0, current + delta);
  }
  return { totals, completeness };
}
