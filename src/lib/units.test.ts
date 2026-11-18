import { describe, expect, it } from "vitest";
import { availableUnits, formatQuantity, parseQuantity, previewPortion, type FoodSummary } from "./units";

// Fixture numbers only exercise the rules; they are not nutrition data.
const row = (basis: "per_serving" | "per_100g", kcal: number | null) => ({
  basis, serving_id: basis === "per_serving" ? "s1" : null, kcal,
  protein_g: null, carbs_g: null, fat_g: null, sat_fat_g: null, fibre_g: null, free_sugars_g: null, total_sugars_g: null, sodium_mg: null,
});
const idli: FoodSummary = { id: "1", canonical_name: "Idli", serving_mode: "count", food_servings: [{ id: "s1", name: "piece", unit_class: "count", grams: null }], food_nutrients: [row("per_serving", 100), row("per_100g", 200)] };
const rice: FoodSummary = { id: "2", canonical_name: "Rice", serving_mode: "household", food_nutrients: [row("per_serving", 100), row("per_100g", 200)] };
const curdOnlyGrams: FoodSummary = { id: "3", canonical_name: "Curd", serving_mode: "household", food_nutrients: [row("per_100g", 60)] };

describe("units", () => {
  it("never offers grams for counted foods", () => {
    expect(availableUnits(idli)).toEqual(["serving"]);
  });
  it("offers what the data supports for household foods", () => {
    expect(availableUnits(rice)).toEqual(["serving", "g"]);
    expect(availableUnits(curdOnlyGrams)).toEqual(["g"]);
  });
  it("scales fractions and keeps unknown nutrients unknown", () => {
    const result = previewPortion(idli, "serving", 1.5);
    expect(result.ok && result.nutrients.kcal).toBe(150);
    expect(result.ok && result.nutrients.proteinG).toBeNull();
  });
  it("blocks grams for a counted food", () => {
    expect(previewPortion(idli, "g", 100)).toEqual({ ok: false, error: "grams_not_allowed" });
  });
  it("parses and formats quantities", () => {
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
    expect(formatQuantity(1.5)).toBe("1½");
    expect(formatQuantity(0.25)).toBe("¼");
    expect(formatQuantity(2)).toBe("2");
  });
});
