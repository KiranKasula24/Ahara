import type { SupabaseClient } from "@supabase/supabase-js";
import { FOOD_SELECT } from "@/lib/food-select";
import type { Per, ProductInput } from "@/lib/product";

const nutrientColumns = (per: Per) => ({
  kcal: per.kcal, protein_g: per.proteinG, carbs_g: per.carbsG, fat_g: per.fatG,
  sat_fat_g: per.satFatG, fibre_g: per.fibreG, total_sugars_g: per.sugarG, sodium_mg: per.sodiumMg,
});

export async function loadFoodSummary(client: SupabaseClient, id: string) {
  const { data } = await client.from("foods").select(FOOD_SELECT).eq("id", id).single();
  return data ? (data as unknown as Record<string, unknown>) : null;
}

/** One packaged-food record: the food, its names, serving, nutrients, product details and barcode. */
export async function createProduct(client: SupabaseClient, userId: string, input: ProductInput): Promise<{ id: string } | string> {
  const servingMode = input.per100g && !input.perServing ? "grams_only" : "household";
  const { data: food, error } = await client
    .from("foods")
    .insert({ owner_id: userId, canonical_name: input.name, kind: "packaged", serving_mode: servingMode, source_kind: "label", user_note: input.note })
    .select("id")
    .single();
  if (error || !food) return error?.message ?? "Could not create the product.";
  const id = food.id as string;
  const fail = async (message: string) => {
    await client.from("foods").delete().eq("id", id); // removes everything attached to the half-made product
    return message;
  };

  const names = [input.name, ...(input.brand ? [`${input.brand} ${input.name}`] : [])];
  const aliases = await client.from("food_aliases").insert(names.map((alias) => ({ food_id: id, alias, language: "en", script: "latin", alias_type: "user", verified: true, match_quality: "exact" })));
  if (aliases.error) return fail(aliases.error.message);

  let servingId: string | null = null;
  if (input.servingName) {
    const serving = await client
      .from("food_servings")
      .insert({ food_id: id, name: input.servingName, unit_class: "household", grams: input.servingGrams, derived: input.perServingDerived, source: input.source === "off" ? "open_food_facts" : "user" })
      .select("id")
      .single();
    if (serving.error || !serving.data) return fail(serving.error?.message ?? "Could not create the serving.");
    servingId = serving.data.id as string;
  }

  const rows = [
    ...(input.per100g ? [{ food_id: id, basis: "per_100g", serving_id: null, confidence: input.per100gDerived ? "derived" : "label", ...nutrientColumns(input.per100g) }] : []),
    ...(input.perServing && servingId ? [{ food_id: id, basis: "per_serving", serving_id: servingId, confidence: input.perServingDerived ? "derived" : "label", ...nutrientColumns(input.perServing) }] : []),
  ];
  const nutrients = await client.from("food_nutrients").insert(rows);
  if (nutrients.error) return fail(nutrients.error.message);

  const details = await client.from("product_details").insert({
    food_id: id, brand: input.brand, provider: input.source === "off" ? "Open Food Facts" : "manual", provider_record_id: input.barcode,
    last_lookup: new Date().toISOString(), lookup_status: input.source === "off" ? "found" : "entered_by_user",
  });
  if (details.error) return fail(details.error.message);

  if (input.barcode) {
    const barcode = await client.from("product_barcodes").insert({ barcode: input.barcode, food_id: id, owner_id: userId });
    if (barcode.error) return fail(barcode.error.code === "23505" ? "You already saved a product with that barcode." : barcode.error.message);
  }
  return { id };
}
