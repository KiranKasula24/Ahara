import { describe, expect, it } from "vitest";
import { describeActivity, parseAmount, sumWorkoutKcal, trackerProgress, trackerSummary, type Tracker } from "./activity";

const tracker = (over: Partial<Tracker>): Tracker => ({ id: "t", name: "Water", kind: "amount", unit: "ml", step: 250, target: 2000, ...over });

describe("activity", () => {
  it("treats a workout without calories as unknown, not zero", () => {
    expect(sumWorkoutKcal([{ kcal: 200 }, { kcal: null }])).toEqual({ total: 200, unknownCount: 1, knownCount: 1 });
    expect(describeActivity([{ kcal: null }], 300)).toContain("without calories");
  });
  it("says at least when some workouts have no calories", () => {
    expect(describeActivity([{ kcal: 100 }, { kcal: null }], 300)).toContain("at least");
  });
  it("uses neutral wording and never mentions intake", () => {
    expect(describeActivity([{ kcal: 350 }], 300)).toContain("reached");
    expect(describeActivity([{ kcal: 100 }], 300)).toBe("100 of 300 kcal from workouts.");
    expect(describeActivity([], null)).toBe("Nothing logged yet.");
  });
  it("summarises trackers by kind", () => {
    expect(trackerSummary(tracker({}), [{ value: 250 }, { value: 250 }])).toBe("500 of 2000 ml");
    expect(trackerSummary(tracker({ kind: "yes_no" }), [])).toBe("Not marked yet");
    expect(trackerSummary(tracker({ kind: "measurement", unit: "kg" }), [{ value: 70 }, { value: 69.5 }])).toBe("Latest: 69.5 kg");
    expect(trackerProgress(tracker({}), [{ value: 5000 }])).toBe(100);
    expect(trackerProgress(tracker({ kind: "yes_no" }), [])).toBeNull();
  });
  it("parses amounts strictly", () => {
    expect(parseAmount("1,5", 10)).toBe(1.5);
    expect(parseAmount("", 10)).toBeNull();
    expect(parseAmount("-1", 10)).toBeNull();
    expect(parseAmount("abc", 10)).toBeNull();
    expect(parseAmount("11", 10)).toBeNull();
  });
});
