import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrast checks", () => {
  it("accepts a WCAG AA text pair", () => expect(contrastRatio("#f5f5f5", "#111111")).toBeGreaterThanOrEqual(4.5));
  it("detects a failing text pair", () => expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5));
});
