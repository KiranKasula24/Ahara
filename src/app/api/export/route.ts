import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function GET(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, foods, logs, steps, activities, trackers, entries] = await Promise.all([auth.client.from("profiles").select("*").maybeSingle(), auth.client.from("foods").select("*").eq("owner_id", auth.user.id), auth.client.from("food_logs").select("*,food_log_nutrients(*),food_log_adjustments(*),food_log_tags(*)"), auth.client.from("daily_steps").select("*"), auth.client.from("activities").select("*"), auth.client.from("trackers").select("*"), auth.client.from("tracker_entries").select("*")]);
  const payload = { exportedAt: new Date().toISOString(), profile: profile.data, privateFoods: foods.data, logs: logs.data, steps: steps.data, activities: activities.data, trackers: trackers.data, trackerEntries: entries.data };
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=ahara-export.json" } });
}
