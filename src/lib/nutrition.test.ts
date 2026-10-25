import { describe, expect, it } from "vitest";
import { calculateAdjusted, calculateBase, sumNutrients, type Nutrients } from "./nutrition";

const values: Nutrients = { kcal: 137.6, proteinG: 3, carbsG: 20, fatG: 4, satFatG: null, fibreG: 1, freeSugarsG: 0, totalSugarsG: null, sodiumMg: 22 };
describe("nutrition calculations", () => {
  it("uses published per-serving values for count foods", () => { expect(calculateBase({ basis: "per_serving", nutrients: values }, .5).kcal).toBe(68.8); });
  it("calculates gram-based foods from the per-100g basis", () => { expect(calculateBase({ basis: "per_100g", nutrients: values }, 150).kcal).toBeCloseTo(206.4); });
  it("keeps unknown values unknown and marks a sum partial", () => { const sum = sumNutrients([values, { ...values, kcal: null }]); expect(sum.values.kcal).toBe(137.6); expect(sum.partial).toContain("kcal"); });
  it("keeps manual per-entry values fixed and per-unit values scaling", () => {
    const base = calculateBase({ basis: "per_serving", nutrients: values }, 2);
    expect(calculateAdjusted(base, 2, [{ kind: "manual_delta", label: "entry", changes: { proteinG: 7 } }]).totals.proteinG).toBe(13);
    expect(calculateAdjusted(base, 3, [{ kind: "manual_delta", label: "unit", changes: { proteinG: 3.5 }, basis: "per_unit" }]).totals.proteinG).toBe(16.5);
  });
  it("does not overwrite known values with set unknown and never drops below zero", () => {
    const result = calculateAdjusted(values, 1, [{ kind: "set_unknown_value", label: "Your value", changes: { totalSugarsG: 2, kcal: 999 } }, { kind: "manual_delta", label: "remove", changes: { fatG: -99 } }]);
    expect(result.totals.totalSugarsG).toBe(2); expect(result.totals.kcal).toBe(137.6); expect(result.totals.fatG).toBe(0);
  });
});
