import { NextResponse } from "next/server";
import { adjustmentToRow, validateAdjustments } from "@/lib/adjustments";
import { calculateAdjusted, type Nutrients } from "@/lib/nutrition";
import { completenessOf } from "@/lib/server/logging";
import { requireUser } from "@/lib/server/request";

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  let body: { logId?: unknown; adjustments?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid adjustment request.");
  }
  if (typeof body.logId !== "string") return bad("Invalid adjustment request.");
  const adjustments = validateAdjustments(body.adjustments);
  if (typeof adjustments === "string") return bad(adjustments);

  const { data: log } = await auth.client.from("food_logs").select("quantity,food_log_nutrients(base_snapshot)").eq("id", body.logId).single();
  const embed = log ? (Array.isArray(log.food_log_nutrients) ? log.food_log_nutrients[0] : log.food_log_nutrients) : null;
  const base = embed?.base_snapshot as Nutrients | undefined;
  if (!log || !base) return bad("Entry not found.", 404);

  const result = calculateAdjusted(base, Number(log.quantity), adjustments);
  const completeness = { ...completenessOf(result.totals), ...result.completeness };
  const { error } = await auth.client.rpc("replace_log_adjustments", {
    p_log_id: body.logId,
    p_adjustments: adjustments.map(adjustmentToRow),
    p_final_totals: result.totals,
    p_completeness: completeness,
  });
  if (error) return bad(error.message);
  return NextResponse.json({ totals: result.totals, completeness });
}
