import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

const permitted = new Set(["junk", "homemade", "sugary_junk", "fried", "sweet", "sugary_drink", "packaged_snack", "high_sodium"]);
export async function PUT(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { logId, tags } = await request.json() as { logId?: string; tags?: { tag: string; source: "auto" | "user" }[] };
  if (!logId || !Array.isArray(tags) || tags.some((item) => !permitted.has(item.tag) || !["auto", "user"].includes(item.source))) return NextResponse.json({ error: "Invalid tags." }, { status: 400 });
  const { error: removeError } = await auth.client.from("food_log_tags").delete().eq("log_id", logId); if (removeError) return NextResponse.json({ error: removeError.message }, { status: 400 });
  if (tags.length) { const { error } = await auth.client.from("food_log_tags").insert(tags.map((item) => ({ log_id: logId, ...item }))); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
  return NextResponse.json({}, { status: 204 });
}
