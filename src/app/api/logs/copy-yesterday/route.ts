import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fromDate, toDate } = await request.json() as { fromDate?: string; toDate?: string };
  if (!fromDate || !toDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return NextResponse.json({ error: "Valid source and destination dates are required." }, { status: 400 });
  const { data: logs, error } = await auth.client.from("food_logs").select("food_id,quantity,unit,meal_type,name_snapshot,serving_name_snapshot,source_kind,notes,consumed_at,food_log_nutrients(base_snapshot,final_totals,completeness)").eq("local_date", fromDate); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const copied = await Promise.all((logs ?? []).map(async (log) => { const id = crypto.randomUUID(); const time = new Date(log.consumed_at).toISOString().slice(11, 19); const { error: logError } = await auth.client.from("food_logs").insert({ ...log, id, owner_id: auth.user.id, consumed_at: `${toDate}T${time}+00:00`, local_date: toDate, food_log_nutrients: undefined }); if (logError) throw logError; const snapshot = log.food_log_nutrients[0]; const { error: nutrientError } = await auth.client.from("food_log_nutrients").insert({ log_id: id, base_snapshot: snapshot.base_snapshot, final_totals: snapshot.final_totals, completeness: snapshot.completeness }); if (nutrientError) throw nutrientError; return id; }));
  return NextResponse.json({ copied: copied.length }, { status: 201 });
}
