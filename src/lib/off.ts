export type Per100g = {
  kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null;
  satFatG: number | null; fibreG: number | null; sugarG: number | null; sodiumMg: number | null;
};
export type ParsedProduct = { barcode: string; name: string; brand: string | null; servingGrams: number | null; per100g: Per100g };

/** EAN-8, UPC-A (12), EAN-13 and ITF-14 are all digits only. */
export const isValidBarcode = (code: string) => /^\d{8,14}$/.test(code);
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Reads an Open Food Facts product response. Anything missing stays null, never zero. */
export function parseOffProduct(barcode: string, json: unknown): ParsedProduct | null {
  const root = json as { status?: number; product?: Record<string, unknown> } | null;
  if (!root || root.status === 0 || !root.product) return null;
  const product = root.product;
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  const number = (key: string): number | null => {
    const raw = nutriments[key];
    const value = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const name = text(product.product_name) ?? text(product.product_name_en) ?? text(product.generic_name);
  if (!name) return null;

  const kcalDirect = number("energy-kcal_100g");
  const kilojoules = number("energy_100g");
  const kcal = kcalDirect !== null ? kcalDirect : kilojoules !== null ? kilojoules / 4.184 : null;
  const sodiumGrams = number("sodium_100g");
  const saltGrams = number("salt_100g");
  const sodiumMg = sodiumGrams !== null ? sodiumGrams * 1000 : saltGrams !== null ? saltGrams * 400 : null; // salt is 40% sodium
  const round = (value: number | null) => (value === null ? null : round2(value));

  const servingRaw = Number(product.serving_quantity);
  const unit = text(product.serving_quantity_unit);
  const servingGrams = Number.isFinite(servingRaw) && servingRaw > 0 && (unit === null || unit === "g") ? servingRaw : null;

  return {
    barcode,
    name,
    brand: text(product.brands)?.split(",")[0].trim() ?? null,
    servingGrams,
    per100g: {
      kcal: round(kcal), proteinG: round(number("proteins_100g")), carbsG: round(number("carbohydrates_100g")), fatG: round(number("fat_100g")),
      satFatG: round(number("saturated-fat_100g")), fibreG: round(number("fiber_100g")), sugarG: round(number("sugars_100g")), sodiumMg: round(sodiumMg),
    },
  };
}
