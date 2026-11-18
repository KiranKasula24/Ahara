import { describe, expect, it } from "vitest";
import { isValidBarcode, parseOffProduct } from "./off";

// Fixture values only exercise parsing and conversion; they are not nutrition data.
const fixture = {
  status: 1,
  product: {
    product_name: "Test biscuit", brands: "Brand A, Brand B", serving_quantity: "25",
    nutriments: { "energy-kcal_100g": 400, proteins_100g: 6, carbohydrates_100g: 70, fat_100g: 10, "saturated-fat_100g": 4, sugars_100g: 20, salt_100g: 1 },
  },
};

describe("Open Food Facts parsing", () => {
  it("reads values and keeps missing ones null, not zero", () => {
    const parsed = parseOffProduct("8901234567890", fixture);
    expect(parsed?.name).toBe("Test biscuit");
    expect(parsed?.brand).toBe("Brand A");
    expect(parsed?.servingGrams).toBe(25);
    expect(parsed?.per100g.kcal).toBe(400);
    expect(parsed?.per100g.fibreG).toBeNull();
  });
  it("converts salt to sodium and kilojoules to kcal", () => {
    expect(parseOffProduct("8901234567890", fixture)?.per100g.sodiumMg).toBe(400);
    const kj = parseOffProduct("8901234567890", { status: 1, product: { product_name: "X", nutriments: { energy_100g: 418.4 } } });
    expect(kj?.per100g.kcal).toBe(100);
  });
  it("returns null for unknown products or ones without a name", () => {
    expect(parseOffProduct("1", { status: 0 })).toBeNull();
    expect(parseOffProduct("1", { status: 1, product: { nutriments: {} } })).toBeNull();
  });
  it("accepts only digit barcodes of valid length", () => {
    expect(isValidBarcode("8901234567890")).toBe(true);
    expect(isValidBarcode("12345")).toBe(false);
    expect(isValidBarcode("89012345678a0")).toBe(false);
  });
});
