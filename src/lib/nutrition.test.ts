import { describe, expect, it } from "vitest";
import { calculateAdjusted, calculateBase, displayRound, intakeStatus, resolveQuantity, sumNutrients, type Nutrients } from "./nutrition";

// Values in this fixture exist only to exercise calculation rules; they are not nutrition data.
const dosa: Nutrients = { kcal: 137.6, proteinG: 3, carbsG: 20, fatG: 4, satFatG: null, fibreG: 1, freeSugarsG: 0, totalSugarsG: null, addedSugarsG: null, sodiumMg: 22 };

describe("nutrition calculations", () => {
  it("scales published count-unit values, including fractions", () => {
    expect(calculateBase({ basis: "per_serving", nutrients: dosa }, 1).kcal).toBe(137.6);
    expect(calculateBase({ basis: "per_serving", nutrients: dosa }, 0.5).kcal).toBe(68.8);
    expect(calculateBase({ basis: "per_serving", nutrients: dosa }, 2).kcal).toBe(275.2);
  });
  it("uses the per-100g basis for gram foods", () => expect(calculateBase({ basis: "per_100g", nutrients: dosa }, 150).kcal).toBeCloseTo(206.4));
  it("refuses grams for a counted food and reports bad quantities without throwing", () => {
    expect(resolveQuantity({ unitClass: "count", perServing: dosa }, 50, "g")).toEqual({ ok: false, error: "grams_not_allowed" });
    expect(resolveQuantity({ unitClass: "household", perServing: dosa }, -1, "serving")).toEqual({ ok: false, error: "invalid_quantity" });
  });
  it("keeps a genuine zero, while unknown totals remain partial", () => {
    const total = sumNutrients([dosa, { ...dosa, proteinG: null }]);
    expect(total.values.freeSugarsG).toBe(0); expect(total.completeness.proteinG).toBe("partial"); expect(total.completeness.totalSugarsG).toBe("unknown");
  });
  it("has below, at, above and empty intake states", () => {
    expect(intakeStatus(null, 2000).state).toBe("empty"); expect(intakeStatus(1975, 2000).state).toBe("at"); expect(intakeStatus(1900, 2000).state).toBe("below"); expect(intakeStatus(2100, 2000).state).toBe("above");
  });
  it("rounds only for display", () => expect(displayRound(68.84, 1)).toBe(68.8));
  it("keeps manual per-entry changes fixed and scales per-unit changes", () => {
    const base = calculateBase({ basis: "per_serving", nutrients: dosa }, 2);
    expect(calculateAdjusted(base, 2, [{ kind: "manual_delta", label: "entry", changes: { proteinG: 7 } }]).totals.proteinG).toBe(13);
    expect(calculateAdjusted(base, 3, [{ kind: "manual_delta", label: "unit", changes: { proteinG: 3.5 }, basis: "per_unit" }]).totals.proteinG).toBe(16.5);
  });
  it("only set_unknown_value fills nulls, and incomplete ingredient changes state their direction", () => {
    const result = calculateAdjusted(dosa, 2, [{ kind: "set_unknown_value", label: "Your value", changes: { totalSugarsG: 2, kcal: 999 }, basis: "per_unit" }, { kind: "measured_ingredient", label: "unknown fibre ingredient", changes: { satFatG: -1 } }]);
    expect(result.totals.totalSugarsG).toBe(4); expect(result.totals.kcal).toBe(137.6); expect(result.completeness.satFatG).toEqual({ notFullyAdjusted: true, direction: "at_most", reason: "unknown fibre ingredient" });
  });
  it("applies a named estimate only to declared nutrients and clamps values at zero", () => {
    const result = calculateAdjusted(dosa, 2, [{ kind: "estimate_preset", label: "Less oily", changes: { fatG: -2 }, accuracyClass: "estimate", assumption: "Sibling reference record", scalesWithQuantity: true }]);
    expect(result.totals.fatG).toBe(0); expect(result.totals.proteinG).toBe(3);
  });
  it("keeps a measured adjustment fixed unless it explicitly scales", () => {
    expect(calculateAdjusted(dosa, 3, [{ kind: "measured_ingredient", label: "oil", changes: { kcal: 40 } }]).totals.kcal).toBe(177.6);
    expect(calculateAdjusted(dosa, 3, [{ kind: "measured_ingredient", label: "oil", changes: { kcal: 40 }, scalesWithQuantity: true }]).totals.kcal).toBe(257.6);
  });
});
