import { NextResponse } from "next/server";
import { validateAdjustments } from "@/lib/adjustments";
import { requireUser } from "@/lib/server/request";

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  let body: { baseFoodId?: unknown; name?: unknown; adjustments?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid version.");
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (typeof body.baseFoodId !== "string" || !name || name.length > 120) return bad("Give the version a name of up to 120 characters.");
  const adjustments = validateAdjustments(body.adjustments);
  if (typeof adjustments === "string") return bad(adjustments);
  if (adjustments.length === 0) return bad("Add at least one adjustment before saving a version.");
  const { data, error } = await auth.client.from("my_versions").insert({ owner_id: auth.user.id, base_food_id: body.baseFoodId, name, adjustments }).select("id").single();
  if (error?.code === "23505") return bad("You already have a version with that name.", 409);
  if (error || !data) return bad(error?.message ?? "Could not save the version.");
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("A version id is required.");
  const { error } = await auth.client.from("my_versions").delete().eq("id", id).eq("owner_id", auth.user.id);
  return error ? bad(error.message) : new NextResponse(null, { status: 204 });
}
