import { NextResponse } from "next/server";
import { FOOD_SELECT } from "@/lib/food-select";
import { requireUser } from "@/lib/server/request";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [recentResult, favouriteResult] = await Promise.all([
    auth.client.from("food_logs").select("food_id,quantity,unit").not("food_id", "is", null).order("consumed_at", { ascending: false }).limit(60),
    auth.client.from("favourite_foods").select("food_id").order("created_at", { ascending: false }).limit(20),
  ]);
  if (recentResult.error || favouriteResult.error) return NextResponse.json({ error: "Could not load your quick list." }, { status: 400 });

  const recentByFood = new Map<string, { quantity: number; unit: "serving" | "g" }>();
  for (const row of recentResult.data ?? []) {
    const id = row.food_id as string;
    if (recentByFood.size >= 12 && !recentByFood.has(id)) continue;
    if (!recentByFood.has(id)) recentByFood.set(id, { quantity: Number(row.quantity), unit: row.unit === "g" ? "g" : "serving" });
  }
  const favouriteIds = (favouriteResult.data ?? []).map((row) => row.food_id as string);
  const ids = [...new Set([...recentByFood.keys(), ...favouriteIds])];
  if (!ids.length) return NextResponse.json({ favourites: [], recents: [] });

  const { data: foods, error } = await auth.client.from("foods").select(FOOD_SELECT).in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const byId = new Map(
    ((foods ?? []) as unknown as { id: string; archived_at?: string | null }[]).filter((food) => !food.archived_at).map((food) => [food.id, food]),
  );
  const recents = [...recentByFood.entries()].flatMap(([id, last]) => (byId.get(id) ? [{ food: byId.get(id), ...last }] : [])).slice(0, 8);
  return NextResponse.json({
    favourites: favouriteIds.flatMap((id) => (byId.get(id) ? [{ food: byId.get(id) }] : [])),
    recents,
  });
}
