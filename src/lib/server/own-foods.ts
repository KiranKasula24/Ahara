import type { SupabaseClient } from "@supabase/supabase-js";
import { OWN_FOOD_SELECT } from "@/lib/food-select";
import type { OwnFoodInput } from "@/lib/own-food";

const nutrientValues = (input: OwnFoodInput) => ({
  kcal: input.kcal,
  protein_g: input.proteinG,
  carbs_g: input.carbsG,
  fat_g: input.fatG,
  total_sugars_g: input.sugarG,
  sodium_mg: input.sodiumMg,
});

export async function loadOwnFood(client: SupabaseClient, id: string) {
  const { data } = await client.from("foods").select(OWN_FOOD_SELECT).eq("id", id).single();
  return data ? (data as unknown as Record<string, unknown>) : null;
}

/** Creates the food, its searchable name, its portion and its nutrients. Returns the new id, or an error message. */
export async function createOwnFood(client: SupabaseClient, userId: string, input: OwnFoodInput): Promise<{ id: string } | string> {
  const { data: food, error } = await client
    .from("foods")
    .insert({ owner_id: userId, canonical_name: input.name, kind: "custom", serving_mode: input.unitKind, source_kind: "user_entered", user_note: input.note })
    .select("id")
    .single();
  if (error || !food) return error?.message ?? "Could not create the food.";
  const id = food.id as string;

  const fail = async (message: string) => {
    await client.from("foods").delete().eq("id", id); // removes the half-made food
    return message;
  };

  const alias = await client.from("food_aliases").insert({ food_id: id, alias: input.name, language: "en", script: "latin", alias_type: "user", verified: true, match_quality: "exact" });
  if (alias.error) return fail(alias.error.message);
  const serving = await client.from("food_servings").insert({ food_id: id, name: input.servingName, unit_class: input.unitKind, source: "user" }).select("id").single();
  if (serving.error || !serving.data) return fail(serving.error?.message ?? "Could not create the portion.");
  const nutrients = await client.from("food_nutrients").insert({ food_id: id, basis: "per_serving", serving_id: serving.data.id, ...nutrientValues(input) });
  if (nutrients.error) return fail(nutrients.error.message);
  return { id };
}

/** Edits an own food. Past diary entries keep the numbers they were saved with. */
export async function updateOwnFood(client: SupabaseClient, foodId: string, input: OwnFoodInput): Promise<string | null> {
  const food = await client.from("foods").update({ canonical_name: input.name, serving_mode: input.unitKind, user_note: input.note }).eq("id", foodId);
  if (food.error) return food.error.message;

  const removed = await client.from("food_aliases").delete().eq("food_id", foodId).eq("alias_type", "user");
  if (removed.error) return removed.error.message;
  const alias = await client.from("food_aliases").insert({ food_id: foodId, alias: input.name, language: "en", script: "latin", alias_type: "user", verified: true, match_quality: "exact" });
  if (alias.error) return alias.error.message;

  const serving = await client.from("food_servings").select("id").eq("food_id", foodId).limit(1).single();
  if (serving.error || !serving.data) return serving.error?.message ?? "This food has no portion to update.";
  const servingUpdate = await client.from("food_servings").update({ name: input.servingName, unit_class: input.unitKind }).eq("id", serving.data.id);
  if (servingUpdate.error) return servingUpdate.error.message;

  const nutrients = await client.from("food_nutrients").update(nutrientValues(input)).eq("food_id", foodId).eq("basis", "per_serving");
  return nutrients.error ? nutrients.error.message : null;
}
