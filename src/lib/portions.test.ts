import { describe, expect, it } from "vitest";
import { batchPerServing, caloriesOnly } from "./portions";

describe("own food and portion rules", () => {
  it("keeps every unspecified nutrient unknown for a calories-only entry", () => expect(caloriesOnly(180)).toMatchObject({ kcal: 180, proteinG: null, sodiumMg: null }));
  it("divides a batch total without rounding stored values", () => expect(batchPerServing(600, 4)).toBe(150));
  it("rejects invalid batch sizes", () => expect(batchPerServing(600, 0)).toBeNull());
});
