import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { foodId?: string; name?: string; grams?: number };
  if (!body.foodId || !body.name?.trim() || body.name.trim().length > 80 || !Number.isFinite(body.grams) || body.grams! <= 0) return NextResponse.json({ error: "A food, portion name, and grams above zero are required." }, { status: 400 });
  const { error } = await auth.client.from("user_portions").insert({ owner_id: auth.user.id, food_id: body.foodId, name: body.name.trim(), grams: body.grams });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({}, { status: 201 });
}
