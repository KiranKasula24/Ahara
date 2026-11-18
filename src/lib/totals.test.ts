import { describe, expect, it } from "vitest";
import { finalKcal, sumKcal } from "./totals";

describe("sumKcal", () => {
  it("is zero for an empty day, not unknown", () => {
    expect(sumKcal([])).toMatchObject({ total: 0, partial: false });
  });
  it("never counts unknown as zero", () => {
    expect(sumKcal([null, null])).toMatchObject({ total: null, partial: false, unknownCount: 2 });
  });
  it("marks a total partial when some entries are unknown", () => {
    expect(sumKcal([138, null, 275])).toMatchObject({ total: 413, partial: true, unknownCount: 1 });
  });
  it("keeps a real zero", () => {
    expect(sumKcal([0, 100])).toMatchObject({ total: 100, partial: false });
  });
});

describe("finalKcal", () => {
  it("reads both embed shapes and returns null for unknown", () => {
    expect(finalKcal({ final_totals: { kcal: 120 } })).toBe(120);
    expect(finalKcal([{ final_totals: { kcal: 120 } }])).toBe(120);
    expect(finalKcal({ final_totals: { kcal: null } })).toBeNull();
    expect(finalKcal(undefined)).toBeNull();
  });
});
