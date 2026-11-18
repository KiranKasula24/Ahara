import { intakeStatus } from "@/lib/nutrition";
import type { KcalTotal } from "@/lib/totals";

export type IntakeState = "no-goal" | "unknown" | "uncertain" | "below" | "at" | "above";
export type IntakeView = { state: IntakeState; text: string; icon: string };

/** Neutral wording only: it describes where the day stands and never judges it. */
export function describeIntake(total: KcalTotal, goal: number | null): IntakeView {
  if (goal === null) return { state: "no-goal", text: "No daily food target set.", icon: "○" };
  if (total.total === null) return { state: "unknown", text: "Calories for these entries are unknown.", icon: "?" };
  const result = intakeStatus(total.total, goal);
  const difference = result.difference ?? 0;
  if (total.partial) {
    return result.state === "above"
      ? { state: "above", text: `At least ${Math.round(difference)} kcal above your target.`, icon: "▲" }
      : { state: "uncertain", text: "Some entries have unknown calories, so the real total may be higher.", icon: "≈" };
  }
  if (result.state === "at") return { state: "at", text: "At your target.", icon: "●" };
  if (result.state === "below") return { state: "below", text: `${Math.round(-difference)} kcal remaining.`, icon: "▽" };
  return { state: "above", text: `${Math.round(difference)} kcal above your target.`, icon: "▲" };
}
