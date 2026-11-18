import { NextResponse } from "next/server";
import { validateAdjustments } from "@/lib/adjustments";
import { FOOD_SELECT } from "@/lib/food-select";
import { requireUser } from "@/lib/server/request";

type Hit = { found_food_id: string; matched_alias: string; match_quality: "exact" | "approximate" };
type VersionRow = { id: string; name: string; adjustments: unknown; base_food_id: string };

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 80) return NextResponse.json({ foods: [], versions: [] });

  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const [hitResult, versionResult] = await Promise.all([
    auth.client.rpc("search_foods", { q: query, max_results: 30 }),
    auth.client.from("my_versions").select("id,name,adjustments,base_food_id").ilike("name", `%${escaped}%`).limit(5),
  ]);
  if (hitResult.error) return NextResponse.json({ error: hitResult.error.message }, { status: 400 });
  const hits = (hitResult.data ?? []) as Hit[];
  const versionRows = (versionResult.data ?? []) as VersionRow[];

  const ids = [...new Set([...hits.map((hit) => hit.found_food_id), ...versionRows.map((row) => row.base_food_id)])];
  if (!ids.length) return NextResponse.json({ foods: [], versions: [] });
  const { data: foods, error } = await auth.client.from("foods").select(FOOD_SELECT).in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const byId = new Map(((foods ?? []) as unknown as { id: string }[]).map((food) => [food.id, food]));

  return NextResponse.json({
    foods: hits.flatMap((hit) => {
      const food = byId.get(hit.found_food_id);
      return food ? [{ ...food, matched_alias: hit.matched_alias, match_quality: hit.match_quality }] : [];
    }),
    versions: versionRows.flatMap((row) => {
      const food = byId.get(row.base_food_id);
      const adjustments = validateAdjustments(row.adjustments);
      return food && Array.isArray(adjustments) ? [{ id: row.id, name: row.name, adjustments, food }] : [];
    }),
  });
}
