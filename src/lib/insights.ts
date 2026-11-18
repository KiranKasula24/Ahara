import { MEALS } from "@/lib/meals";

export type RangeKind = "week" | "month" | "year";
export type InsightLog = { local_date: string; meal_type: string; name_snapshot: string; kcal: number | null; tags: string[] };
export type GoalVersion = { value: number; starts_at: string; ends_at: string | null };
export type DayStatus = "none" | "nogoal" | "below" | "at" | "above" | "uncertain";
export type Bucket = { key: string; label: string; kcal: number | null; partial: boolean; goal: number | null; logged: boolean };
export type Insights = {
  range: RangeKind; start: string; end: string; label: string;
  elapsedDays: number; loggedDays: number;
  average: { kcal: number | null; partial: boolean };
  buckets: Bucket[];
  statusCounts: { below: number; at: number; above: number; uncertain: number };
  hasGoal: boolean;
  meals: { meal: string; kcal: number; entries: number }[];
  tags: { tag: string; entries: number; kcal: number }[];
  topFoods: { name: string; count: number; kcal: number | null }[];
  unknownEntries: number;
};

export const TOLERANCE_KCAL = 25;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (value: number) => String(value).padStart(2, "0");
const toDate = (text: string) => {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const toText = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const isDateString = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text) && toText(toDate(text)) === text;
export function addDays(text: string, days: number): string {
  const date = toDate(text);
  date.setUTCDate(date.getUTCDate() + days);
  return toText(date);
}

export function rangeBounds(range: RangeKind, anchor: string): { start: string; end: string } {
  const date = toDate(anchor);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (range === "week") return { start: addDays(anchor, -6), end: anchor };
  if (range === "month") return { start: `${year}-${pad(month + 1)}-01`, end: toText(new Date(Date.UTC(year, month + 1, 0))) };
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function shiftAnchor(range: RangeKind, anchor: string, direction: 1 | -1): string {
  const date = toDate(anchor);
  if (range === "week") return addDays(anchor, 7 * direction);
  if (range === "month") return toText(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction, 1)));
  return `${date.getUTCFullYear() + direction}-01-01`;
}

export function rangeLabel(range: RangeKind, start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (range === "year") return String(s.getUTCFullYear());
  if (range === "month") return `${MONTHS_LONG[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`;
}

/** The goal in force on a date, so a changed goal never rewrites older days. */
export function goalOn(goals: GoalVersion[], date: string): number | null {
  const match = goals
    .filter((goal) => goal.starts_at <= date && (goal.ends_at === null || goal.ends_at >= date))
    .sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1))[0];
  return match ? Number(match.value) : null;
}

export function dayStatus(kcal: number | null, partial: boolean, goal: number | null, hasEntries: boolean): DayStatus {
  if (!hasEntries) return "none";
  if (goal === null) return "nogoal";
  if (kcal === null) return "uncertain";
  if (kcal > goal + TOLERANCE_KCAL) return "above"; // "at least" is already above, so this holds for partial days too
  if (partial) return "uncertain";
  return kcal < goal - TOLERANCE_KCAL ? "below" : "at";
}

const known = (values: (number | null)[]) => values.filter((value): value is number => value !== null);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function buildInsights(args: { range: RangeKind; anchor: string; today: string; logs: InsightLog[]; goals: GoalVersion[] }): Insights {
  const { range, anchor, today, goals } = args;
  const { start, end } = rangeBounds(range, anchor);
  const logs = args.logs.filter((log) => log.local_date >= start && log.local_date <= end);

  const byDate = new Map<string, InsightLog[]>();
  for (const log of logs) byDate.set(log.local_date, [...(byDate.get(log.local_date) ?? []), log]);

  const days: { date: string; entries: number; kcal: number | null; partial: boolean; goal: number | null; status: DayStatus }[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const items = byDate.get(date) ?? [];
    const knownKcal = known(items.map((item) => item.kcal));
    const kcal = knownKcal.length > 0 ? sum(knownKcal) : null; // a day with only unknown calories has no total
    const partial = items.some((item) => item.kcal === null);
    const goal = goalOn(goals, date);
    days.push({ date, entries: items.length, kcal, partial, goal, status: dayStatus(kcal, partial, goal, items.length > 0) });
  }

  const elapsed = days.filter((day) => day.date <= today);
  const logged = elapsed.filter((day) => day.entries > 0);
  const withTotals = logged.filter((day) => day.kcal !== null);
  const average = {
    kcal: withTotals.length > 0 ? Math.round(sum(withTotals.map((day) => day.kcal as number)) / withTotals.length) : null,
    partial: logged.some((day) => day.partial),
  };

  let buckets: Bucket[];
  if (range === "year") {
    buckets = MONTHS.map((label, index) => {
      const prefix = `${start.slice(0, 4)}-${pad(index + 1)}`;
      const month = days.filter((day) => day.date.startsWith(prefix));
      const totals = month.filter((day) => day.kcal !== null);
      return {
        key: prefix, label: label[0], kcal: totals.length > 0 ? Math.round(sum(totals.map((day) => day.kcal as number)) / totals.length) : null,
        partial: month.some((day) => day.partial), goal: goalOn(goals, month[month.length - 1].date), logged: month.some((day) => day.entries > 0),
      };
    });
  } else {
    buckets = days.map((day) => ({
      key: day.date,
      label: range === "week" ? WEEKDAYS[toDate(day.date).getUTCDay()] : String(Number(day.date.slice(8))),
      kcal: day.kcal === null ? null : Math.round(day.kcal), partial: day.partial, goal: day.goal, logged: day.entries > 0,
    }));
  }

  const statusCounts = { below: 0, at: 0, above: 0, uncertain: 0 };
  for (const day of elapsed) if (day.status in statusCounts) statusCounts[day.status as keyof typeof statusCounts] += 1;

  const mealMap = new Map<string, { kcal: number; entries: number }>();
  const tagMap = new Map<string, { entries: number; kcal: number }>();
  const foodMap = new Map<string, { count: number; kcals: number[] }>();
  for (const log of logs) {
    const meal = mealMap.get(log.meal_type) ?? { kcal: 0, entries: 0 };
    mealMap.set(log.meal_type, { kcal: meal.kcal + (log.kcal ?? 0), entries: meal.entries + 1 });
    for (const tag of log.tags) {
      const entry = tagMap.get(tag) ?? { entries: 0, kcal: 0 };
      tagMap.set(tag, { entries: entry.entries + 1, kcal: entry.kcal + (log.kcal ?? 0) });
    }
    const food = foodMap.get(log.name_snapshot) ?? { count: 0, kcals: [] };
    foodMap.set(log.name_snapshot, { count: food.count + 1, kcals: log.kcal === null ? food.kcals : [...food.kcals, log.kcal] });
  }

  const order = [...MEALS] as string[];
  return {
    range, start, end, label: rangeLabel(range, start, end),
    elapsedDays: elapsed.length, loggedDays: logged.length, average, buckets, statusCounts,
    hasGoal: days.some((day) => day.goal !== null),
    meals: [...mealMap.entries()].map(([meal, value]) => ({ meal, ...value })).sort((a, b) => (order.indexOf(a.meal) + 99) % 99 - (order.indexOf(b.meal) + 99) % 99),
    tags: [...tagMap.entries()].map(([tag, value]) => ({ tag, ...value })).sort((a, b) => b.entries - a.entries),
    topFoods: [...foodMap.entries()]
      .map(([name, value]) => ({ name, count: value.count, kcal: value.kcals.length > 0 ? Math.round(sum(value.kcals)) : null }))
      .sort((a, b) => (b.kcal ?? -1) - (a.kcal ?? -1) || b.count - a.count)
      .slice(0, 8),
    unknownEntries: logs.filter((log) => log.kcal === null).length,
  };
}
