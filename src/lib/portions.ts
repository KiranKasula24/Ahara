import type { Nutrients } from "./nutrition";

export function batchPerServing(total: number, servings: number): number | null {
  return Number.isFinite(total) && Number.isFinite(servings) && total >= 0 && servings > 0 ? total / servings : null;
}
export function caloriesOnly(kcal: number): Nutrients {
  return { kcal, proteinG: null, carbsG: null, fatG: null, satFatG: null, fibreG: null, freeSugarsG: null, totalSugarsG: null, addedSugarsG: null, sodiumMg: null };
}
