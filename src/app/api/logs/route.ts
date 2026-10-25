import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";
import { resolveQuantity, type Nutrients } from "@/lib/nutrition";

type Payload = { id: string; foodId: string; quantity: number; unit: "serving" | "g"; mealType: string; consumedAt: string };
const meals = new Set(["breakfast", "lunch", "dinner", "snack"]);
function snapshot(row: Record<string, unknown>): Nutrients { return { kcal: row.kcal as number | null, proteinG: row.protein_g as number | null, carbsG: row.carbs_g as number | null, fatG: row.fat_g as number | null, satFatG: row.sat_fat_g as number | null, fibreG: row.fibre_g as number | null, freeSugarsG: row.free_sugars_g as number | null, totalSugarsG: row.total_sugars_g as number | null, addedSugarsG: null, sodiumMg: row.sodium_mg as number | null, extra: row.extra as Nutrients["extra"] }; }
export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<Payload>;
  if (!body.id || !body.foodId || !Number.isFinite(body.quantity) || body.quantity! <= 0 || !meals.has(body.mealType ?? "") || !body.consumedAt || (body.unit !== "serving" && body.unit !== "g")) return NextResponse.json({ error: "Invalid log input" }, { status: 400 });
  const { data: food, error } = await auth.client.from("foods").select("id,canonical_name,serving_mode,source_kind,food_servings(id,name,unit_class),food_nutrients(basis,serving_id,kcal,protein_g,carbs_g,fat_g,sat_fat_g,fibre_g,free_sugars_g,total_sugars_g,sodium_mg,extra)").eq("id", body.foodId).single();
  if (error || !food) return NextResponse.json({ error: "Food not found" }, { status: 404 });
  const servings = food.food_servings as { id: string; name: string; unit_class: string }[]; const nutrients = food.food_nutrients as (Record<string, unknown> & { basis: "per_serving" | "per_100g"; serving_id: string | null })[];
  const perServing = nutrients.find((nutrient) => nutrient.basis === "per_serving"); const per100g = nutrients.find((nutrient) => nutrient.basis === "per_100g");
  const result = resolveQuantity({ unitClass: food.serving_mode, perServing: perServing ? snapshot(perServing) : undefined, per100g: per100g ? snapshot(per100g) : undefined }, body.quantity!, body.unit!);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const serving = servings[0]; const log = { id: body.id, owner_id: auth.user.id, consumed_at: new Date(body.consumedAt).toISOString(), local_date: "2000-01-01", meal_type: body.mealType, food_id: food.id, quantity: body.quantity, unit: body.unit === "g" ? "g" : serving?.name ?? "serving", name_snapshot: food.canonical_name, serving_name_snapshot: body.unit === "g" ? null : serving?.name ?? null, source_kind: food.source_kind };
  const { error: logError } = await auth.client.from("food_logs").insert(log); if (logError?.code === "23505") return NextResponse.json({ duplicate: true }); if (logError) return NextResponse.json({ error: logError.message }, { status: 400 });
  const completeness = Object.fromEntries(Object.entries(result.nutrients).filter(([key]) => key !== "extra").map(([key, value]) => [key, value === null ? "unknown" : "complete"]));
  const { error: nutrientError } = await auth.client.from("food_log_nutrients").insert({ log_id: body.id, base_snapshot: result.nutrients, final_totals: result.nutrients, completeness }); if (nutrientError) return NextResponse.json({ error: nutrientError.message }, { status: 400 });
  return NextResponse.json({ id: body.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<Payload>;
  if (!body.id || !Number.isFinite(body.quantity) || body.quantity! <= 0 || !meals.has(body.mealType ?? "") || !body.consumedAt || (body.unit !== "serving" && body.unit !== "g")) return NextResponse.json({ error: "Invalid log input" }, { status: 400 });
  const { data: existing, error: existingError } = await auth.client.from("food_logs").select("food_id").eq("id", body.id).single(); if (existingError || !existing?.food_id) return NextResponse.json({ error: "Log not found" }, { status: 404 });
  const { data: food, error } = await auth.client.from("foods").select("canonical_name,serving_mode,food_servings(id,name),food_nutrients(basis,serving_id,kcal,protein_g,carbs_g,fat_g,sat_fat_g,fibre_g,free_sugars_g,total_sugars_g,sodium_mg,extra)").eq("id", existing.food_id).single(); if (error || !food) return NextResponse.json({ error: "Food is no longer available" }, { status: 404 });
  const list = food.food_nutrients as (Record<string, unknown> & { basis: "per_serving" | "per_100g" })[]; const result = resolveQuantity({ unitClass: food.serving_mode, perServing: list.find((item) => item.basis === "per_serving") ? snapshot(list.find((item) => item.basis === "per_serving")!) : undefined, per100g: list.find((item) => item.basis === "per_100g") ? snapshot(list.find((item) => item.basis === "per_100g")!) : undefined }, body.quantity!, body.unit!); if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const serving = (food.food_servings as { name: string }[])[0]; const { error: updateError } = await auth.client.from("food_logs").update({ consumed_at: new Date(body.consumedAt).toISOString(), meal_type: body.mealType, quantity: body.quantity, unit: body.unit === "g" ? "g" : serving?.name ?? "serving", serving_name_snapshot: body.unit === "g" ? null : serving?.name ?? null }).eq("id", body.id); if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  const { data: oldSnapshot } = await auth.client.from("food_log_nutrients").select("snapshot_version").eq("log_id", body.id).single(); const completeness = Object.fromEntries(Object.entries(result.nutrients).filter(([key]) => key !== "extra").map(([key, value]) => [key, value === null ? "unknown" : "complete"])); const { error: snapshotError } = await auth.client.from("food_log_nutrients").update({ base_snapshot: result.nutrients, final_totals: result.nutrients, completeness, snapshot_version: (oldSnapshot?.snapshot_version ?? 0) + 1 }).eq("log_id", body.id); if (snapshotError) return NextResponse.json({ error: snapshotError.message }, { status: 400 });
  return NextResponse.json({ id: body.id });
}
