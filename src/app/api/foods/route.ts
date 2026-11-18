import { NextResponse } from "next/server";
import { validateOwnFoodInput } from "@/lib/own-food";
import { createOwnFood, loadOwnFood, updateOwnFood } from "@/lib/server/own-foods";
import { requireUser } from "@/lib/server/request";

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const body = await readBody(request);
  if (!body) return bad("Invalid food.");
  const input = validateOwnFoodInput(body);
  if (typeof input === "string") return bad(input);
  const created = await createOwnFood(auth.client, auth.user.id, input);
  if (typeof created === "string") return bad(created);
  return NextResponse.json({ id: created.id, food: await loadOwnFood(auth.client, created.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const body = await readBody(request);
  if (!body || typeof body.id !== "string") return bad("Invalid food.");
  const input = validateOwnFoodInput(body);
  if (typeof input === "string") return bad(input);
  const { data: owned } = await auth.client.from("foods").select("id").eq("id", body.id).eq("owner_id", auth.user.id).maybeSingle();
  if (!owned) return bad("Food not found.", 404);
  const failure = await updateOwnFood(auth.client, body.id, input);
  if (failure) return bad(failure);
  return NextResponse.json({ id: body.id, food: await loadOwnFood(auth.client, body.id) });
}

/** "Delete" archives the food: it leaves search, but past diary entries are untouched. */
export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return bad("Unauthorized", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("A food id is required.");
  const { error } = await auth.client.from("foods").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("owner_id", auth.user.id);
  return error ? bad(error.message) : new NextResponse(null, { status: 204 });
}
