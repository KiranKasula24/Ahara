import { NextResponse } from "next/server";
import { DEFAULT_TIME_ZONE, isValidTimeZone, localDate } from "@/lib/dates";
import { buildInsights, isDateString, rangeBounds, type GoalVersion, type InsightLog, type RangeKind } from "@/lib/insights";
import { requireUser } from "@/lib/server/request";

const PAGE = 1000;
type Row = {
  local_date: string; meal_type: string; name_snapshot: string;
  food_log_nutrients: unknown; food_log_tags: { tag: string }[] | null;
};

function kcalOf(embed: unknown): number | null {
  const one = Array.isArray(embed) ? embed[0] : embed;
  const value = (one as { final_totals?: { kcal?: unknown } } | null | undefined)?.final_totals?.kcal;
  return typeof value === "number" ? value : null;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const range = params.get("range") as RangeKind;
  if (!["week", "month", "year"].includes(range)) return NextResponse.json({ error: "Choose week, month or year." }, { status: 400 });

  const { data: profile } = await auth.client.from("profiles").select("timezone").eq("id", auth.user.id).maybeSingle();
  const zone = profile?.timezone && isValidTimeZone(profile.timezone) ? profile.timezone : DEFAULT_TIME_ZONE;
  const today = localDate(zone);
  const anchorParam = params.get("anchor");
  if (anchorParam && !isDateString(anchorParam)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  const anchor = anchorParam ?? today;
  const { start, end } = rangeBounds(range, anchor);

  const logs: InsightLog[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await auth.client
      .from("food_logs")
      .select("local_date,meal_type,name_snapshot,food_log_nutrients(final_totals),food_log_tags(tag)")
      .gte("local_date", start).lte("local_date", end)
      .order("local_date").order("id")
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const rows = (data ?? []) as unknown as Row[];
    for (const row of rows) {
      logs.push({
        local_date: row.local_date, meal_type: row.meal_type, name_snapshot: row.name_snapshot,
        kcal: kcalOf(row.food_log_nutrients), tags: (row.food_log_tags ?? []).map((item) => item.tag),
      });
    }
    if (rows.length < PAGE) break;
  }

  const { data: goalRows } = await auth.client.from("goal_versions").select("value,starts_at,ends_at").eq("kind", "intake_kcal");
  const goals = ((goalRows ?? []) as GoalVersion[]).map((goal) => ({ ...goal, value: Number(goal.value) }));
  return NextResponse.json({ insights: buildInsights({ range, anchor, today, logs, goals }), today, anchor });
}
