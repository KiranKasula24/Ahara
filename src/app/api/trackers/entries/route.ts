import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { id?: string; trackerId?: string; localDate?: string; occurredAt?: string; value?: number; note?: string };
  if (!body.id || !body.trackerId || !body.localDate || !body.occurredAt || !Number.isFinite(body.value)) return NextResponse.json({ error: "A replay-safe id, tracker, date, time and value are required." }, { status: 400 });
  const { error } = await auth.client.from("tracker_entries").insert({ id: body.id, owner_id: auth.user.id, tracker_id: body.trackerId, local_date: body.localDate, occurred_at: new Date(body.occurredAt).toISOString(), value: body.value, note: body.note?.trim() || null }); return error?.code === "23505" ? NextResponse.json({ duplicate: true }) : error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ id: body.id }, { status: 201 });
}
