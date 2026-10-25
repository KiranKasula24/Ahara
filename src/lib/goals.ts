export type GoalVersion = { value: number; startsAt: string; endsAt: string | null };

/** Produces a closed former version and a new current version without altering history. */
export function versionIntakeGoal(current: GoalVersion | null, value: number, today: string): GoalVersion[] {
  if (!Number.isFinite(value) || value <= 0) return [];
  if (current?.value === value) return [current];
  const previous = current ? { ...current, endsAt: today } : null;
  return [...(previous ? [previous] : []), { value, startsAt: today, endsAt: null }];
}
