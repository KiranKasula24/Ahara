import { describe, expect, it } from "vitest";
import { describeIntake } from "./day-status";
import { sumKnown } from "./totals";

describe("describeIntake", () => {
  it("handles no target and unknown calories", () => {
    expect(describeIntake(sumKnown([100]), null).state).toBe("no-goal");
    expect(describeIntake(sumKnown([null]), 2000).state).toBe("unknown");
  });
  it("describes below, at and above with the 25 kcal tolerance", () => {
    expect(describeIntake(sumKnown([1500]), 2000)).toMatchObject({ state: "below", text: "500 kcal remaining." });
    expect(describeIntake(sumKnown([1990]), 2000).state).toBe("at");
    expect(describeIntake(sumKnown([2300]), 2000)).toMatchObject({ state: "above", text: "300 kcal above your target." });
  });
  it("never claims 'at target' when something is unknown", () => {
    expect(describeIntake(sumKnown([1990, null]), 2000).state).toBe("uncertain");
    expect(describeIntake(sumKnown([2300, null]), 2000).text).toContain("At least 300");
  });
  it("shows the whole target remaining on an empty day", () => {
    expect(describeIntake(sumKnown([]), 2000).text).toBe("2000 kcal remaining.");
  });
});
