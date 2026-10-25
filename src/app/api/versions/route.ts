import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { baseFoodId?: string; name?: string; adjustments?: unknown[] };
  if (!body.baseFoodId || !body.name?.trim() || body.name.trim().length > 120 || !Array.isArray(body.adjustments)) return NextResponse.json({ error: "A base food, name, and adjustment list are required." }, { status: 400 });
  const { error } = await auth.client.from("my_versions").insert({ owner_id: auth.user.id, base_food_id: body.baseFoodId, name: body.name.trim(), adjustments: body.adjustments });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({}, { status: 201 });
}
