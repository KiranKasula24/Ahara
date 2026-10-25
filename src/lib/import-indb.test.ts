import { describe, expect, it } from "vitest";
import { flagsFor, normaliseRows, nutrientsFor } from "../../scripts/import-indb/core";

// Fixture numbers test importer behavior only; they are not nutrition data.
describe("INDB normalisation", () => {
  const countUnits = new Set(["idli", "dosa"]);
  it("preserves raw rows, parses parenthetical aliases and classifies count units", () => {
    const raw = { food_code: "1", food_name: "Dosa (plain; dosai)", servings_unit: "dosa", energy_kcal: 137.6 };
    const row = normaliseRows([raw], countUnits)[0];
    expect(row.raw_row).toEqual(raw); expect(row.aliases).toEqual(["plain", "dosai"]); expect(row.serving_mode).toBe("count");
  });
  it("converts fatty acids from mg and keeps an explicit zero", () => {
    const nutrients = nutrientsFor({ sfa_mg: 250, mufa_mg: 0, freesugar_g: 0 });
    expect(nutrients.sat_fat_g).toEqual({ value: 0.25, unit: "g" }); expect(nutrients.mono_fat_g).toEqual({ value: 0, unit: "g" }); expect(nutrients.free_sugars_g).toEqual({ value: 0, unit: "g" });
  });
  it("flags a mismatch but never modifies the published value", () => {
    const flags = flagsFor({ energy_kcal: 300, protein_g: 1, carb_g: 1, fat_g: 1, energy_kj: 10 });
    expect(flags).toContain("energy_macro_simple"); expect(flags).toContain("kj_kcal_ratio");
  });
  it("uses grams-only when a row has no serving unit", () => expect(normaliseRows([{ food_code: "2", food_name: "Rice", servings_unit: null }], countUnits)[0].serving_mode).toBe("grams_only"));
});
