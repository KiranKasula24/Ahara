import { NextResponse } from "next/server";
import { calculateAdjusted, type Adjustment, type NutrientKey } from "@/lib/nutrition";
import { completenessOf, loadLoggableFood, parseEntry, QUANTITY_MESSAGES, resolveEntry } from "@/lib/server/logging";
import { requireUser } from "@/lib/server/request";

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const body = await readBody(request);
  if (!body || typeof body.id !== "string" || typeof body.foodId !== "string") return bad("Invalid log input");
  const entry = parseEntry(body);
  if (typeof entry === "string") return bad(entry);

  const food = await loadLoggableFood(auth.client, body.foodId);
  if (!food) return bad("Food not found", 404);
  const { result, servingName } = resolveEntry(food, entry.quantity, entry.unit);
  if (!result.ok) return bad(QUANTITY_MESSAGES[result.error]);

  const { error: logError } = await auth.client.from("food_logs").insert({
    id: body.id,
    owner_id: auth.user.id,
    consumed_at: entry.consumedAt.toISOString(),
    local_date: "2000-01-01", // placeholder: a database trigger sets the real local date from the profile time zone
    meal_type: entry.mealType,
    food_id: food.id,
    quantity: entry.quantity,
    unit: entry.unit === "g" ? "g" : servingName ?? "serving",
    name_snapshot: food.canonical_name,
    serving_name_snapshot: servingName,
    source_kind: food.source_kind,
  });
  if (logError?.code === "23505") return NextResponse.json({ duplicate: true });
  if (logError) return bad(logError.message);

  const { error: nutrientError } = await auth.client.from("food_log_nutrients").insert({
    log_id: body.id,
    base_snapshot: result.nutrients,
    final_totals: result.nutrients,
    completeness: completenessOf(result.nutrients),
  });
  if (nutrientError) {
    await auth.client.from("food_logs").delete().eq("id", body.id); // never leave an entry without its snapshot
    return bad(nutrientError.message);
  }
  return NextResponse.json({ id: body.id }, { status: 201 });
}

type AdjustmentRow = {
  kind: Adjustment["kind"];
  accuracy_class: "measured" | "estimate" | "manual";
  label: string;
  nutrient_changes: Partial<Record<NutrientKey, number>>;
  assumption: string | null;
  basis: "per_entry" | "per_unit";
  scales_with_quantity: boolean;
};

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const body = await readBody(request);
  if (!body || typeof body.id !== "string") return bad("Invalid log input");
  const entry = parseEntry(body);
  if (typeof entry === "string") return bad(entry);

  const { data: existing } = await auth.client.from("food_logs").select("food_id").eq("id", body.id).single();
  if (!existing?.food_id) return bad("Log not found, or its food was removed.", 404);
  const food = await loadLoggableFood(auth.client, existing.food_id as string);
  if (!food) return bad("Food is no longer available", 404);
  const { result, servingName } = resolveEntry(food, entry.quantity, entry.unit);
  if (!result.ok) return bad(QUANTITY_MESSAGES[result.error]);

  // Re-apply the entry's saved adjustments to the new amount so the numbers stay consistent.
  const { data: adjustmentRows } = await auth.client
    .from("food_log_adjustments")
    .select("kind,accuracy_class,label,nutrient_changes,assumption,basis,scales_with_quantity")
    .eq("log_id", body.id)
    .order("position");
  const adjustments: Adjustment[] = ((adjustmentRows ?? []) as AdjustmentRow[]).map((row) => ({
    kind: row.kind,
    label: row.label,
    changes: row.nutrient_changes,
    basis: row.basis,
    scalesWithQuantity: row.scales_with_quantity,
    accuracyClass: row.accuracy_class,
    assumption: row.assumption ?? undefined,
  }));
  const adjusted = calculateAdjusted(result.nutrients, entry.quantity, adjustments);

  const { error: updateError } = await auth.client
    .from("food_logs")
    .update({
      consumed_at: entry.consumedAt.toISOString(),
      meal_type: entry.mealType,
      quantity: entry.quantity,
      unit: entry.unit === "g" ? "g" : servingName ?? "serving",
      serving_name_snapshot: servingName,
    })
    .eq("id", body.id);
  if (updateError) return bad(updateError.message);

  const { data: snapshot } = await auth.client.from("food_log_nutrients").select("snapshot_version").eq("log_id", body.id).single();
  const { error: snapshotError } = await auth.client
    .from("food_log_nutrients")
    .update({
      base_snapshot: result.nutrients,
      final_totals: adjusted.totals,
      completeness: { ...completenessOf(adjusted.totals), ...adjusted.completeness },
      snapshot_version: ((snapshot?.snapshot_version as number | undefined) ?? 0) + 1,
    })
    .eq("log_id", body.id);
  if (snapshotError) return bad(snapshotError.message);
  return NextResponse.json({ id: body.id });
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("A log id is required.");
  const { error } = await auth.client.from("food_logs").delete().eq("id", id).eq("owner_id", auth.user.id);
  return error ? bad(error.message) : new NextResponse(null, { status: 204 });
}
