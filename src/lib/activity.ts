export type Workout = { id: string; name: string; duration_min: number; kcal: number | null };
export type TrackerKind = "counter" | "amount" | "yes_no" | "measurement";
export type Tracker = { id: string; name: string; kind: TrackerKind; unit: string | null; step: number | null; target: number | null };
export type TrackerEntry = { id: string; tracker_id: string; value: number; created_at: string };

export const KIND_LABELS: Record<TrackerKind, string> = {
  counter: "Count (cups, tablets…)",
  amount: "Amount (ml, g…)",
  yes_no: "Yes or no each day",
  measurement: "Measurement (weight…)",
};

const round1 = (value: number) => Math.round(value * 10) / 10;
export const formatNumber = (value: number) => String(round1(value));

/** Workout calories. A workout without calories is unknown, never zero. */
export function sumWorkoutKcal(workouts: Pick<Workout, "kcal">[]) {
  const known = workouts.filter((workout) => workout.kcal !== null);
  return {
    total: known.reduce((sum, workout) => sum + (workout.kcal as number), 0),
    unknownCount: workouts.length - known.length,
    knownCount: known.length,
  };
}

/** Neutral wording. Activity is never netted against intake. */
export function describeActivity(workouts: Pick<Workout, "kcal">[], goal: number | null): string {
  if (workouts.length === 0) return goal === null ? "Nothing logged yet." : `Nothing logged yet. Your activity target is ${Math.round(goal)} kcal.`;
  const { total, unknownCount, knownCount } = sumWorkoutKcal(workouts);
  if (knownCount === 0) return "Workouts logged without calories, so there is no total to compare.";
  const caveat = unknownCount > 0 ? ` (at least: ${unknownCount} workout${unknownCount === 1 ? " has" : "s have"} no calories)` : "";
  const shown = Math.round(total);
  if (goal === null) return `${shown} kcal from workouts${caveat}.`;
  return shown >= goal
    ? `${shown} kcal from workouts${caveat}. Your target of ${Math.round(goal)} kcal is reached.`
    : `${shown} of ${Math.round(goal)} kcal from workouts${caveat}.`;
}

export function trackerSummary(tracker: Tracker, entries: Pick<TrackerEntry, "value">[]): string {
  const unit = tracker.unit ? ` ${tracker.unit}` : "";
  if (tracker.kind === "yes_no") return entries.length > 0 ? "Done today" : "Not marked yet";
  if (tracker.kind === "measurement") {
    return entries.length > 0 ? `Latest: ${formatNumber(entries[entries.length - 1].value)}${unit}` : "No reading yet";
  }
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const target = tracker.target ? ` of ${formatNumber(tracker.target)}` : "";
  return `${formatNumber(total)}${target}${unit}`;
}

export function trackerProgress(tracker: Tracker, entries: Pick<TrackerEntry, "value">[]): number | null {
  if (!tracker.target || (tracker.kind !== "counter" && tracker.kind !== "amount")) return null;
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return Math.min(100, Math.round((total / tracker.target) * 100));
}

export function parseAmount(text: string, max: number): number | null {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}
