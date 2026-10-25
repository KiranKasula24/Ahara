import { describe, expect, it } from "vitest";
import { activityStatus, calculateActivity } from "./activity";
describe("activity calculations", () => {
  it("does not double count workout steps", () => expect(calculateActivity({ workoutCalories: 100, steps: 5000, workoutSteps: 2000, weightKg: 60, stepsEstimateEnabled: true }).estimatedStepCalories).toBe(90));
  it("does not estimate without a saved weight", () => expect(calculateActivity({ workoutCalories: null, steps: 5000, weightKg: null, stepsEstimateEnabled: true }).totalCalories).toBeNull());
  it("reports below, at and above separately", () => { expect(activityStatus(90, 100)).toBe("at"); expect(activityStatus(80, 100)).toBe("below"); expect(activityStatus(120, 100)).toBe("above"); });
});
