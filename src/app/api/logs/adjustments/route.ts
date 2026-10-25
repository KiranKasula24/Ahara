import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";
import { calculateAdjusted, type Adjustment, type Nutrients } from "@/lib/nutrition";

function validAdjustment(value: unknown): value is Adjustment { const item = value as Partial<Adjustment>; return !!item && typeof item.label === "string" && ["measured_ingredient", "estimate_preset", "percent_of_base", "manual_delta", "set_unknown_value"].includes(item.kind ?? "") && !!item.changes; }
export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { logId?: string; adjustments?: unknown[] };
  if (!body.logId || !Array.isArray(body.adjustments) || !body.adjustments.every(validAdjustment)) return NextResponse.json({ error: "Invalid adjustment request." }, { status: 400 });
  const { data: log, error: logError } = await auth.client.from("food_logs").select("quantity,food_log_nutrients(base_snapshot,snapshot_version)").eq("id", body.logId).single(); if (logError || !log) return NextResponse.json({ error: "Log not found." }, { status: 404 });
  const snapshot = log.food_log_nutrients[0]; const result = calculateAdjusted(snapshot.base_snapshot as Nutrients, Number(log.quantity), body.adjustments);
  const { error: deleteError } = await auth.client.from("food_log_adjustments").delete().eq("log_id", body.logId); if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  if (body.adjustments.length) { const { error } = await auth.client.from("food_log_adjustments").insert(body.adjustments.map((adjustment, position) => ({ log_id: body.logId, kind: adjustment.kind, accuracy_class: adjustment.accuracyClass ?? "manual", label: adjustment.label, nutrient_changes: adjustment.changes, assumption: adjustment.assumption ?? null, position, basis: adjustment.basis ?? "per_entry", scales_with_quantity: adjustment.scalesWithQuantity ?? false, snapshot_version: snapshot.snapshot_version + 1 }))); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
  const { error: updateError } = await auth.client.from("food_log_nutrients").update({ final_totals: result.totals, completeness: result.completeness, snapshot_version: snapshot.snapshot_version + 1 }).eq("log_id", body.logId); return updateError ? NextResponse.json({ error: updateError.message }, { status: 400 }) : NextResponse.json({ totals: result.totals, completeness: result.completeness });
}
