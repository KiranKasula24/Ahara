import { resolveQuantity, type Nutrients, type QuantityResult } from "@/lib/nutrition";

export type PortionUnit = "serving" | "g";
export type NutrientRow = {
  basis: "per_serving" | "per_100g";
  serving_id?: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  fibre_g: number | null;
  free_sugars_g: number | null;
  total_sugars_g: number | null;
  sodium_mg: number | null;
};
export type ServingRow = { id: string; name: string; unit_class: string; grams: number | null };
export type FoodSummary = {
  id: string;
  canonical_name: string;
  serving_mode: "count" | "household" | "grams_only";
  owner_id?: string | null;
  food_servings?: ServingRow[];
  food_nutrients?: NutrientRow[];
  matched_alias?: string;
  match_quality?: "exact" | "approximate";
};

export function rowToNutrients(row: NutrientRow): Nutrients {
  return {
    kcal: row.kcal, proteinG: row.protein_g, carbsG: row.carbs_g, fatG: row.fat_g, satFatG: row.sat_fat_g,
    fibreG: row.fibre_g, freeSugarsG: row.free_sugars_g, totalSugarsG: row.total_sugars_g, addedSugarsG: null, sodiumMg: row.sodium_mg,
  };
}

const perServingRow = (food: FoodSummary) => food.food_nutrients?.find((row) => row.basis === "per_serving");
const per100gRow = (food: FoodSummary) => food.food_nutrients?.find((row) => row.basis === "per_100g");

/** Counted foods never allow grams; other foods offer whatever their data supports. */
export function availableUnits(food: FoodSummary): PortionUnit[] {
  const hasServing = Boolean(perServingRow(food));
  const hasGrams = Boolean(per100gRow(food));
  if (food.serving_mode === "count") return hasServing ? ["serving"] : [];
  if (food.serving_mode === "household") return [...(hasServing ? (["serving"] as const) : []), ...(hasGrams ? (["g"] as const) : [])];
  return hasGrams ? ["g"] : [];
}

export function servingNameFor(food: FoodSummary): string {
  const row = perServingRow(food);
  const match = row?.serving_id ? food.food_servings?.find((serving) => serving.id === row.serving_id) : undefined;
  return match?.name ?? food.food_servings?.[0]?.name ?? (food.serving_mode === "count" ? "piece" : "serving");
}

export const quantityChips = (unit: PortionUnit): number[] => (unit === "g" ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2, 3]);
export const quantityStep = (unit: PortionUnit) => (unit === "g" ? 10 : 0.25);
export const minQuantity = (unit: PortionUnit) => (unit === "g" ? 1 : 0.25);

export function parseQuantity(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return Number.isFinite(value) && value > 0 && value <= 10000 ? value : null;
}

export function formatQuantity(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const fraction = Math.round((value - whole) * 100) / 100;
  if (fraction === 0) return String(whole);
  const glyph = ({ 0.25: "¼", 0.5: "½", 0.75: "¾" } as Record<number, string>)[fraction];
  if (glyph) return whole === 0 ? glyph : `${whole}${glyph}`;
  return String(Math.round(value * 100) / 100);
}

export function previewPortion(food: FoodSummary, unit: PortionUnit, quantity: number): QuantityResult {
  const perServing = perServingRow(food);
  const per100g = per100gRow(food);
  return resolveQuantity(
    { unitClass: food.serving_mode, perServing: perServing ? rowToNutrients(perServing) : undefined, per100g: per100g ? rowToNutrients(per100g) : undefined },
    quantity,
    unit,
  );
}

/** One-line description for search results, such as "piece · 138 kcal". */
export function defaultKcalLabel(food: FoodSummary): string {
  const serving = perServingRow(food);
  if (serving) return serving.kcal === null ? `${servingNameFor(food)} · calories unavailable` : `${servingNameFor(food)} · ${Math.round(serving.kcal)} kcal`;
  const grams = per100gRow(food);
  if (grams) return grams.kcal === null ? "per 100 g · calories unavailable" : `per 100 g · ${Math.round(grams.kcal)} kcal`;
  return "Nutrition unavailable";
}
