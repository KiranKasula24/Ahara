import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; kcal?: number; note?: string; batchTotal?: number; batchServings?: number };
  const name = body.name?.trim(); let kcal = Number(body.kcal);
  if (body.batchTotal !== undefined || body.batchServings !== undefined) kcal = Number(body.batchTotal) / Number(body.batchServings);
  if (!name || name.length > 120 || !Number.isFinite(kcal) || kcal < 0) return NextResponse.json({ error: "A name and non-negative calories per portion are required." }, { status: 400 });
  const note = body.note?.trim() || null; if (note && note.length > 500) return NextResponse.json({ error: "The source note is too long." }, { status: 400 });
  const { data: food, error } = await auth.client.from("foods").insert({ owner_id: auth.user.id, canonical_name: name, kind: "custom", serving_mode: "household", source_kind: "user_entered", user_note: note }).select("id").single();
  if (error || !food) return NextResponse.json({ error: error?.message ?? "Could not create the food." }, { status: 400 });
  const { data: serving, error: servingError } = await auth.client.from("food_servings").insert({ food_id: food.id, name: "portion", unit_class: "household", source: "user" }).select("id").single();
  if (servingError || !serving) return NextResponse.json({ error: servingError?.message ?? "Could not create the portion." }, { status: 400 });
  const { error: nutrientError } = await auth.client.from("food_nutrients").insert({ food_id: food.id, basis: "per_serving", serving_id: serving.id, kcal });
  if (nutrientError) return NextResponse.json({ error: nutrientError.message }, { status: 400 });
  return NextResponse.json({ id: food.id }, { status: 201 });
}
