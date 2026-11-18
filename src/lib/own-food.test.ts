import { describe, expect, it } from "vitest";
import { buildOwnFood, parseNumber, validateOwnFoodInput, type OwnFoodFormValues } from "./own-food";

const base: OwnFoodFormValues = {
  name: "Amma’s pesarattu", unitKind: "count", servingName: "piece", mode: "portion", servingsMade: "",
  kcal: "120", protein: "", carbs: "", fat: "", sugar: "", sodium: "", note: "",
};

describe("own foods", () => {
  it("keeps blank nutrients unknown, never zero", () => {
    const result = buildOwnFood(base);
    expect(result.ok && result.value.proteinG).toBeNull();
    expect(result.ok && result.value.kcal).toBe(120);
  });
  it("keeps a typed zero as a real zero", () => {
    const result = buildOwnFood({ ...base, fat: "0" });
    expect(result.ok && result.value.fatG).toBe(0);
  });
  it("divides a whole batch by the servings made", () => {
    const result = buildOwnFood({ ...base, mode: "batch", servingsMade: "8", kcal: "1600", protein: "40" });
    expect(result.ok && result.value.kcal).toBe(200);
    expect(result.ok && result.value.proteinG).toBe(5);
  });
  it("requires calories and sensible numbers", () => {
    expect(buildOwnFood({ ...base, kcal: "" }).ok).toBe(false);
    expect(buildOwnFood({ ...base, kcal: "-5" }).ok).toBe(false);
    expect(buildOwnFood({ ...base, mode: "batch", servingsMade: "0" }).ok).toBe(false);
    expect(buildOwnFood({ ...base, kcal: "abc" }).ok).toBe(false);
  });
  it("validates on the server side too", () => {
    expect(typeof validateOwnFoodInput({ name: "", unitKind: "count", servingName: "piece", kcal: 100 })).toBe("string");
    expect(typeof validateOwnFoodInput({ name: "Dosa", unitKind: "grams", servingName: "piece", kcal: 100 })).toBe("string");
    expect(typeof validateOwnFoodInput({ name: "Dosa", unitKind: "count", servingName: "piece", kcal: 99999 })).toBe("string");
  });
  it("parses blanks and commas", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("x")).toBe("invalid");
  });
});
