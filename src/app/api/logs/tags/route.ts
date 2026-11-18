import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

const PERMITTED = new Set(["junk", "homemade", "sugary_junk", "fried", "sweet", "sugary_drink", "packaged_snack", "high_sodium"]);
const bad = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { logId?: unknown; tags?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid tags.");
  }
  const tags = body.tags;
  if (typeof body.logId !== "string" || !Array.isArray(tags) || tags.length > 8 || tags.some((tag) => typeof tag !== "string" || !PERMITTED.has(tag))) return bad("Invalid tags.");
  const unique = [...new Set(tags as string[])];

  if (unique.length) {
    const { error } = await auth.client.from("food_log_tags").upsert(unique.map((tag) => ({ log_id: body.logId, tag, source: "user" })), { onConflict: "log_id,tag" });
    if (error) return bad(error.message);
  }
  let remove = auth.client.from("food_log_tags").delete().eq("log_id", body.logId as string);
  if (unique.length) remove = remove.not("tag", "in", `(${unique.join(",")})`);
  const { error: removeError } = await remove;
  if (removeError) return bad(removeError.message);
  return NextResponse.json({ tags: unique });
}
