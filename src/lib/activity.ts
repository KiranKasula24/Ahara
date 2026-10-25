export type ActivityStatus = "empty" | "below" | "at" | "above";
export type ActivityInput = { workoutCalories: number | null; steps: number | null; weightKg: number | null; stepsEstimateEnabled: boolean; workoutSteps?: number | null };
export type ActivityResult = { workoutCalories: number; estimatedStepCalories: number | null; totalCalories: number | null; status: ActivityStatus };

/** Conservative estimate for steps outside a workout; it never changes intake targets. */
export function calculateActivity(input: ActivityInput): ActivityResult {
  const workoutCalories = input.workoutCalories ?? 0;
  if (!input.stepsEstimateEnabled || input.steps === null || input.weightKg === null || input.weightKg <= 0) return { workoutCalories, estimatedStepCalories: null, totalCalories: input.workoutCalories === null ? null : workoutCalories, status: input.workoutCalories === null ? "empty" : "below" };
  const outsideWorkout = Math.max(0, input.steps - (input.workoutSteps ?? 0));
  // Transparent approximation: 0.0005 kcal per kg per non-workout step.
  const estimatedStepCalories = outsideWorkout * input.weightKg * 0.0005;
  return { workoutCalories, estimatedStepCalories, totalCalories: workoutCalories + estimatedStepCalories, status: "below" };
}
export function activityStatus(total: number | null, goal: number | null, tolerance = 10): ActivityStatus { if (total === null || goal === null) return "empty"; if (Math.abs(total - goal) <= tolerance) return "at"; return total < goal ? "below" : "above"; }
