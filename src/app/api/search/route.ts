import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

export async function GET(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim(); if (!query || query.length < 2 || query.length > 80) return NextResponse.json({ foods: [] });
  const escaped = query.replace(/[%_]/g, "\\$&");
  const { data: aliases, error } = await auth.client.from("food_aliases").select("food_id,alias,verified,match_quality,foods(id,canonical_name,serving_mode,source_kind,kind,food_servings(id,name,unit_class,grams),food_nutrients(basis,serving_id,kcal,protein_g,carbs_g,fat_g,sat_fat_g,fibre_g,free_sugars_g,total_sugars_g,sodium_mg,extra))").ilike("alias", `%${escaped}%`).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const unique = new Map<string, unknown>();
  for (const alias of aliases ?? []) if (alias.foods && !unique.has(alias.food_id)) unique.set(alias.food_id, { ...alias.foods, matched_alias: alias.alias, verified: alias.verified, match_quality: alias.match_quality });
  return NextResponse.json({ foods: [...unique.values()].sort((a, b) => Number((b as { verified: boolean }).verified) - Number((a as { verified: boolean }).verified)) });
}
