import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { foodId, favourite } = await request.json() as { foodId?: string; favourite?: boolean };
  if (!foodId) return NextResponse.json({ error: "foodId is required" }, { status: 400 });
  const query = favourite ? auth.client.from("favourite_foods").upsert({ owner_id: auth.user.id, food_id: foodId }) : auth.client.from("favourite_foods").delete().eq("owner_id", auth.user.id).eq("food_id", foodId);
  const { error } = await query; return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({}, { status: 204 });
}
