import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

function range(period: string, end: Date) { const start = new Date(end); start.setUTCDate(start.getUTCDate() - (period === "year" ? 364 : period === "month" ? 29 : 6)); return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }; }
export async function GET(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const period = new URL(request.url).searchParams.get("period") ?? "week"; if (!["week", "month", "year"].includes(period)) return NextResponse.json({ error: "Invalid period." }, { status: 400 }); const dates = range(period, new Date());
  const { data: logs, error } = await auth.client.from("food_logs").select("local_date,name_snapshot,food_log_nutrients(final_totals)").gte("local_date", dates.start).lte("local_date", dates.end); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const daily = new Map<string, number>(); const foods = new Map<string, number>(); for (const log of logs ?? []) { const kcal = Number(log.food_log_nutrients[0]?.final_totals?.kcal); if (Number.isFinite(kcal)) { daily.set(log.local_date, (daily.get(log.local_date) ?? 0) + kcal); foods.set(log.name_snapshot, (foods.get(log.name_snapshot) ?? 0) + kcal); } }
  return NextResponse.json({ period, ...dates, loggedDays: daily.size, daily: [...daily.entries()].map(([date, kcal]) => ({ date, kcal })), topFoods: [...foods.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, kcal]) => ({ name, kcal })), note: "Unlogged days are excluded, never treated as zero." });
}
