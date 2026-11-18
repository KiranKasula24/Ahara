import type { SupabaseClient } from "@supabase/supabase-js";
import { nutrientKeys, resolveQuantity, type Nutrients, type QuantityError, type QuantityResult, type UnitClass } from "@/lib/nutrition";

type NutrientRow = {
  basis: "per_serving" | "per_100g";
  serving_id: string | null;
  kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; sat_fat_g: number | null;
  fibre_g: number | null; free_sugars_g: number | null; total_sugars_g: number | null; sodium_mg: number | null;
  extra?: Nutrients["extra"];
};
export type LoggableFood = {
  id: string;
  canonical_name: string;
  serving_mode: UnitClass;
  source_kind: string;
  food_servings: { id: string; name: string }[];
  food_nutrients: NutrientRow[];
};

const SELECT =
  "id,canonical_name,serving_mode,source_kind,food_servings(id,name)," +
  "food_nutrients(basis,serving_id,kcal,protein_g,carbs_g,fat_g,sat_fat_g,fibre_g,free_sugars_g,total_sugars_g,sodium_mg,extra)";

export async function loadLoggableFood(client: SupabaseClient, foodId: string): Promise<LoggableFood | null> {
  const { data, error } = await client.from("foods").select(SELECT).eq("id", foodId).single();
  return error || !data ? null : (data as unknown as LoggableFood);
}

function toNutrients(row: NutrientRow): Nutrients {
  return {
    kcal: row.kcal, proteinG: row.protein_g, carbsG: row.carbs_g, fatG: row.fat_g, satFatG: row.sat_fat_g,
    fibreG: row.fibre_g, freeSugarsG: row.free_sugars_g, totalSugarsG: row.total_sugars_g, addedSugarsG: null,
    sodiumMg: row.sodium_mg, extra: row.extra,
  };
}

export function resolveEntry(food: LoggableFood, quantity: number, unit: "serving" | "g"): { result: QuantityResult; servingName: string | null } {
  const perServing = food.food_nutrients.find((row) => row.basis === "per_serving");
  const per100g = food.food_nutrients.find((row) => row.basis === "per_100g");
  const result = resolveQuantity(
    { unitClass: food.serving_mode, perServing: perServing ? toNutrients(perServing) : undefined, per100g: per100g ? toNutrients(per100g) : undefined },
    quantity,
    unit,
  );
  const serving = perServing ? food.food_servings.find((item) => item.id === perServing.serving_id) ?? food.food_servings[0] : undefined;
  return { result, servingName: unit === "g" ? null : serving?.name ?? null };
}

export function completenessOf(values: Nutrients): Record<string, "complete" | "unknown"> {
  return Object.fromEntries(nutrientKeys.map((key) => [key, values[key] === null ? "unknown" : "complete"]));
}

export const QUANTITY_MESSAGES: Record<QuantityError, string> = {
  invalid_quantity: "Enter an amount above zero.",
  grams_not_allowed: "This food is counted in pieces, so grams aren’t available.",
  unknown_serving: "This food has no nutrition data for that unit.",
};

const MEALS = new Set(["breakfast", "lunch", "snack", "dinner"]);
export type EntryInput = { quantity: number; unit: "serving" | "g"; mealType: string; consumedAt: Date };

/** Validates the fields shared by creating and editing a log. Returns an error message or the clean values. */
export function parseEntry(body: Record<string, unknown>): EntryInput | string {
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) return "Enter an amount above zero.";
  if (body.unit !== "serving" && body.unit !== "g") return "Choose a unit.";
  if (typeof body.mealType !== "string" || !MEALS.has(body.mealType)) return "Choose a meal.";
  const consumedAt = new Date(String(body.consumedAt));
  if (Number.isNaN(consumedAt.getTime())) return "Choose a valid date and time.";
  if (consumedAt.getTime() > Date.now() + 5 * 60 * 1000) return "That time is in the future.";
  return { quantity, unit: body.unit, mealType: body.mealType, consumedAt };
}
