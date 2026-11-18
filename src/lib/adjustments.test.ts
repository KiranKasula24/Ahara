import { describe, expect, it } from "vitest";
import { describeChange, fillUnknownFromForm, manualFromForm, measuredFromFood, validateAdjustments } from "./adjustments";
import { emptyNutrients } from "./nutrition";

// Fixture numbers only exercise the rules; they are not nutrition data.
const ghee = { ...emptyNutrients(), kcal: 900, fatG: 100, proteinG: 0, carbsG: 0 };

describe("adjustments", () => {
  it("calculates a measured ingredient from per-100 g values and lists what it lacks", () => {
    const result = measuredFromFood({ name: "Ghee", per100g: ghee, grams: 5, direction: 1, perUnit: false });
    if (typeof result === "string") throw new Error(result);
    expect(result.adjustment.changes).toMatchObject({ kcal: 45, fatG: 5, proteinG: 0 });
    expect(result.adjustment.changes.sodiumMg).toBeUndefined();
    expect(result.missing).toContain("sodium");
    expect(result.adjustment.assumption).toContain("No data for");
  });
  it("makes the change negative when something is left out", () => {
    const result = measuredFromFood({ name: "Ghee", per100g: ghee, grams: 10, direction: -1, perUnit: true });
    if (typeof result === "string") throw new Error(result);
    expect(result.adjustment.changes.kcal).toBe(-90);
    expect(result.adjustment.basis).toBe("per_unit");
  });
  it("rejects nonsense amounts", () => {
    expect(typeof measuredFromFood({ name: "Ghee", per100g: ghee, grams: 0, direction: 1, perUnit: false })).toBe("string");
    expect(typeof measuredFromFood({ name: "Ghee", per100g: emptyNutrients(), grams: 5, direction: 1, perUnit: false })).toBe("string");
  });
  it("builds manual and fill-unknown adjustments, blank meaning no change", () => {
    const manual = manualFromForm({ label: "Extra ghee, my guess", direction: 1, values: { kcal: "80", fatG: "" }, perUnit: false });
    expect(typeof manual === "string" ? manual : manual.changes).toEqual({ kcal: 80 });
    expect(typeof manualFromForm({ label: "", direction: 1, values: { kcal: "5" }, perUnit: false })).toBe("string");
    expect(typeof manualFromForm({ label: "x", direction: 1, values: {}, perUnit: false })).toBe("string");
    const fill = fillUnknownFromForm({ sodiumMg: "300" });
    expect(typeof fill === "string" ? fill : fill.kind).toBe("set_unknown_value");
  });
  it("validates adjustments on the server side", () => {
    expect(typeof validateAdjustments("nope")).toBe("string");
    expect(typeof validateAdjustments([{ kind: "manual_delta", label: "x", changes: { fibreG: 2 } }])).toBe("string");
    expect(typeof validateAdjustments([{ kind: "manual_delta", label: "x", changes: { kcal: 1e9 } }])).toBe("string");
    const ok = validateAdjustments([{ kind: "manual_delta", label: "Extra", changes: { kcal: 50 } }]);
    expect(Array.isArray(ok) && ok[0].accuracyClass).toBe("manual");
  });
  it("describes changes plainly", () => {
    expect(describeChange({ kcal: 45, fatG: 5, sodiumMg: -20 })).toBe("+45 kcal, +5 g fat, −20 mg sodium");
  });
});
