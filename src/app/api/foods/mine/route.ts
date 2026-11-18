import { NextResponse } from "next/server";
import { OWN_FOOD_SELECT } from "@/lib/food-select";
import { requireUser } from "@/lib/server/request";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.client
    .from("foods")
    .select(OWN_FOOD_SELECT)
    .eq("owner_id", auth.user.id)
    .eq("kind", "custom")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ foods: data ?? [] });
}
