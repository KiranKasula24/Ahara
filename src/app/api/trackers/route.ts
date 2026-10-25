import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

const kinds = new Set(["counter", "amount", "yes_no", "measurement"]);
export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; kind?: string; unit?: string; icon?: string; colour?: string; linkedFoodId?: string };
  if (!body.name?.trim() || body.name.trim().length > 80 || !kinds.has(body.kind ?? "")) return NextResponse.json({ error: "A tracker name and valid type are required." }, { status: 400 });
  const { count, error: countError } = await auth.client.from("trackers").select("id", { count: "exact", head: true }).eq("status", "active"); if (countError) return NextResponse.json({ error: countError.message }, { status: 400 }); if ((count ?? 0) >= 12) return NextResponse.json({ error: "You can keep up to 12 active trackers." }, { status: 400 });
  const { data, error } = await auth.client.from("trackers").insert({ owner_id: auth.user.id, name: body.name.trim(), kind: body.kind, unit: body.unit?.trim() || null, icon: body.icon?.trim() || null, colour: body.colour?.trim() || null, linked_food_id: body.linkedFoodId ?? null }).select("id").single(); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}
