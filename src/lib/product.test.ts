import { describe, expect, it } from "vitest";
import { buildProduct, type ProductFormValues } from "./product";

// Fixture numbers only exercise the rules; they are not nutrition data.
const form: ProductFormValues = {
  barcode: "8901234567890", name: "Test biscuit", brand: "", source: "manual", basis: "per100g", servingName: "biscuit", servingGrams: "",
  kcal: "400", protein: "", carbs: "70", fat: "", satFat: "", fibre: "", sugar: "", sodium: "", note: "",
};

describe("packaged products", () => {
  it("keeps blank values unknown and a gram-only food when there is no serving size", () => {
    const result = buildProduct(form);
    expect(result.ok && result.value.per100g?.proteinG).toBeNull();
    expect(result.ok && result.value.perServing).toBeNull();
  });
  it("derives the per-serving values from per-100 g and flags them", () => {
    const result = buildProduct({ ...form, servingGrams: "25" });
    expect(result.ok && result.value.perServing?.kcal).toBe(100);
    expect(result.ok && result.value.perServingDerived).toBe(true);
    expect(result.ok && result.value.perServing?.proteinG).toBeNull();
  });
  it("derives per-100 g from per-serving values when the serving size is known", () => {
    const result = buildProduct({ ...form, basis: "perServing", kcal: "100", carbs: "17.5", servingGrams: "25" });
    expect(result.ok && result.value.per100g?.kcal).toBe(400);
    expect(result.ok && result.value.per100gDerived).toBe(true);
  });
  it("needs calories and a sane barcode", () => {
    expect(buildProduct({ ...form, kcal: "" }).ok).toBe(false);
    expect(buildProduct({ ...form, barcode: "12ab" }).ok).toBe(false);
    expect(buildProduct({ ...form, name: " " }).ok).toBe(false);
  });
});
