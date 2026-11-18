import { NextResponse } from "next/server";
import { validateProductInput } from "@/lib/product";
import { createProduct, loadFoodSummary } from "@/lib/server/products";
import { requireUser } from "@/lib/server/request";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }
  const input = validateProductInput(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const created = await createProduct(auth.client, auth.user.id, input);
  if (typeof created === "string") return NextResponse.json({ error: created }, { status: 400 });
  return NextResponse.json({ id: created.id, food: await loadFoodSummary(auth.client, created.id) }, { status: 201 });
}
