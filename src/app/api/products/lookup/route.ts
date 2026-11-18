import { NextResponse } from "next/server";
import { FOOD_SELECT } from "@/lib/food-select";
import { isValidBarcode, parseOffProduct } from "@/lib/off";
import { requireUser } from "@/lib/server/request";

const FIELDS = "product_name,product_name_en,generic_name,brands,nutriments,serving_quantity,serving_quantity_unit";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const barcode = new URL(request.url).searchParams.get("barcode")?.trim() ?? "";
  if (!isValidBarcode(barcode)) return NextResponse.json({ error: "That doesn’t look like a valid barcode." }, { status: 400 });

  // 1. Already saved by you: no outside lookup needed.
  const { data: link } = await auth.client.from("product_barcodes").select("food_id").eq("barcode", barcode).limit(1).maybeSingle();
  if (link) {
    const { data: food } = await auth.client.from("foods").select(FOOD_SELECT).eq("id", link.food_id).single();
    if (food) return NextResponse.json({ source: "saved", food });
  }

  // 2. Open Food Facts. Responses are cached for a day so the same barcode is never fetched twice.
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`, {
      headers: { "User-Agent": "Ahara/0.1 (personal nutrition tracker)" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (response.status === 429) return NextResponse.json({ error: "Open Food Facts is busy right now. Try again in a minute, or enter the label values yourself." }, { status: 429 });
    if (response.ok) {
      const product = parseOffProduct(barcode, await response.json());
      if (product) return NextResponse.json({ source: "off", product });
    }
    return NextResponse.json({ source: "none", barcode });
  } catch {
    return NextResponse.json({ source: "none", barcode, unreachable: true });
  }
}
