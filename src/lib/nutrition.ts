/** Pure nutrition rules. Source values enter this module unchanged. */
export type NutrientKey = "kcal" | "proteinG" | "carbsG" | "fatG" | "satFatG" | "fibreG" | "freeSugarsG" | "totalSugarsG" | "addedSugarsG" | "sodiumMg";
export type Nutrients = Record<NutrientKey, number | null> & { extra?: Record<string, { value: number | null; unit: string }> };
export type ServingBasis = "per_serving" | "per_100g";
export type UnitClass = "count" | "household" | "grams_only";
export type FoodBasis = { basis: ServingBasis; nutrients: Nutrients };
export type FoodQuantity = { unitClass: UnitClass; perServing?: Nutrients; per100g?: Nutrients; defensibleServingGrams?: number | null };
export type QuantityError = "invalid_quantity" | "grams_not_allowed" | "unknown_serving";
export type QuantityResult = { ok: true; nutrients: Nutrients } | { ok: false; error: QuantityError };
export type NutrientCompleteness = "complete" | "partial" | "unknown";
export type TotalResult = { values: Nutrients; completeness: Record<NutrientKey, NutrientCompleteness>; partial: NutrientKey[] };
export type IntakeStatus = { state: "empty"; difference: null } | { state: "below" | "at" | "above"; difference: number };
export type AdjustmentKind = "measured_ingredient" | "estimate_preset" | "percent_of_base" | "manual_delta" | "set_unknown_value";
export type Adjustment = { kind: AdjustmentKind; label: string; changes: Partial<Record<NutrientKey, number>>; basis?: "per_entry" | "per_unit"; scalesWithQuantity?: boolean; accuracyClass?: "measured" | "estimate" | "manual"; assumption?: string };
export type Completeness = Partial<Record<NutrientKey, { notFullyAdjusted: true; direction: "at_least" | "at_most"; reason: string }>>;

export const nutrientKeys: NutrientKey[] = ["kcal", "proteinG", "carbsG", "fatG", "satFatG", "fibreG", "freeSugarsG", "totalSugarsG", "addedSugarsG", "sodiumMg"];
export function emptyNutrients(): Nutrients { return Object.fromEntries(nutrientKeys.map((key) => [key, null])) as unknown as Nutrients; }
function validQuantity(value: number): boolean { return Number.isFinite(value) && value >= 0; }

export function calculateBase(food: FoodBasis, amount: number): Nutrients {
  if (!validQuantity(amount)) return emptyNutrients();
  const multiplier = food.basis === "per_100g" ? amount / 100 : amount;
  return Object.fromEntries(nutrientKeys.map((key) => [key, food.nutrients[key] === null ? null : food.nutrients[key]! * multiplier])) as unknown as Nutrients;
}

/** Resolves an entry without ever treating missing published data as zero. */
export function resolveQuantity(food: FoodQuantity, quantity: number, unit: "serving" | "g"): QuantityResult {
  if (!validQuantity(quantity)) return { ok: false, error: "invalid_quantity" };
  if (unit === "g") {
    if (food.unitClass === "count") return { ok: false, error: "grams_not_allowed" };
    if (!food.per100g) return { ok: false, error: "unknown_serving" };
    return { ok: true, nutrients: calculateBase({ basis: "per_100g", nutrients: food.per100g }, quantity) };
  }
  if (!food.perServing) return { ok: false, error: "unknown_serving" };
  return { ok: true, nutrients: calculateBase({ basis: "per_serving", nutrients: food.perServing }, quantity) };
}

export function sumNutrients(rows: Nutrients[]): TotalResult {
  const values = emptyNutrients(); const completeness = {} as Record<NutrientKey, NutrientCompleteness>; const partial: NutrientKey[] = [];
  for (const key of nutrientKeys) {
    const known = rows.filter((row) => row[key] !== null);
    values[key] = known.reduce((sum, row) => sum + row[key]!, 0);
    completeness[key] = known.length === 0 ? "unknown" : known.length === rows.length ? "complete" : "partial";
    if (completeness[key] === "partial") partial.push(key);
  }
  return { values, completeness, partial };
}

export function intakeStatus(consumed: number | null, goal: number | null, tolerance = 25): IntakeStatus {
  if (consumed === null || goal === null) return { state: "empty", difference: null };
  const difference = consumed - goal;
  if (Math.abs(difference) <= tolerance) return { state: "at", difference };
  return { state: difference < 0 ? "below" : "above", difference };
}

/** Round only at the display boundary; stored values retain their precision. */
export function displayRound(value: number | null, decimals = 0): number | null { if (value === null) return null; const scale = 10 ** decimals; return Math.round(value * scale) / scale; }

/** Applies frozen log adjustments. Ordinary adjustments cannot fill an unknown source value. */
export function calculateAdjusted(base: Nutrients, quantity: number, adjustments: Adjustment[]): { totals: Nutrients; completeness: Completeness } {
  const totals = { ...base }; const completeness: Completeness = {};
  for (const adjustment of adjustments) for (const key of nutrientKeys) {
    const change = adjustment.changes[key]; if (change === undefined || !Number.isFinite(change)) continue;
    const current = totals[key];
    if (adjustment.kind === "set_unknown_value") { if (current === null) totals[key] = change * (adjustment.basis === "per_unit" ? quantity : 1); continue; }
    if (current === null) { completeness[key] = { notFullyAdjusted: true, direction: change < 0 ? "at_most" : "at_least", reason: adjustment.label }; continue; }
    const multiplier = adjustment.kind === "percent_of_base" || adjustment.scalesWithQuantity || adjustment.basis === "per_unit" ? quantity : 1;
    const delta = adjustment.kind === "percent_of_base" ? current * (change / 100) : change * multiplier;
    totals[key] = Math.max(0, current + delta);
  }
  return { totals, completeness };
}
