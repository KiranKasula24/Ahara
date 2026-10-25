import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { type?: "steps" | "workout"; localDate?: string; steps?: number; activityType?: string; occurredAt?: string; durationMinutes?: number; distanceKm?: number; calories?: number };
  if (!body.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.localDate)) return NextResponse.json({ error: "A local date is required." }, { status: 400 });
  if (body.type === "steps") { if (!Number.isInteger(body.steps) || body.steps! < 0) return NextResponse.json({ error: "Steps must be a non-negative whole number." }, { status: 400 }); const { error } = await auth.client.from("daily_steps").upsert({ owner_id: auth.user.id, local_date: body.localDate, steps: body.steps }, { onConflict: "owner_id,local_date" }); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({}, { status: 201 }); }
  if (body.type === "workout") { if (!body.activityType?.trim() || !body.occurredAt) return NextResponse.json({ error: "Workout type and time are required." }, { status: 400 }); const { error } = await auth.client.from("activities").insert({ owner_id: auth.user.id, local_date: body.localDate, occurred_at: new Date(body.occurredAt).toISOString(), activity_type: body.activityType.trim(), duration_minutes: body.durationMinutes ?? null, distance_km: body.distanceKm ?? null, calories: body.calories ?? null }); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({}, { status: 201 }); }
  return NextResponse.json({ error: "Unknown activity type." }, { status: 400 });
}
