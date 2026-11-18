import { describe, expect, it } from "vitest";
import { addDays, buildInsights, dayStatus, goalOn, isDateString, rangeBounds, shiftAnchor, type InsightLog } from "./insights";

// Fixture numbers only exercise the rules; they are not nutrition data.
const log = (date: string, kcal: number | null, over: Partial<InsightLog> = {}): InsightLog => ({
  local_date: date, meal_type: "lunch", name_snapshot: "Test food", kcal, tags: [], ...over,
});
const goals = [{ value: 2000, starts_at: "2026-01-01", ends_at: null }];

describe("insight ranges", () => {
  it("computes week, month and year bounds", () => {
    expect(rangeBounds("week", "2026-11-14")).toEqual({ start: "2026-11-08", end: "2026-11-14" });
    expect(rangeBounds("month", "2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(rangeBounds("year", "2026-06-01")).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });
  it("shifts across month and year edges", () => {
    expect(shiftAnchor("month", "2026-01-15", -1)).toBe("2025-12-01");
    expect(shiftAnchor("year", "2026-03-01", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("validates date strings", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-11-14")).toBe(true);
  });
});

describe("goal history", () => {
  it("uses the goal in force on each day", () => {
    const history = [
      { value: 1800, starts_at: "2026-01-01", ends_at: "2026-06-30" },
      { value: 2000, starts_at: "2026-07-01", ends_at: null },
    ];
    expect(goalOn(history, "2026-03-01")).toBe(1800);
    expect(goalOn(history, "2026-08-01")).toBe(2000);
    expect(goalOn(history, "2025-12-31")).toBeNull();
  });
});

describe("day status", () => {
  it("never calls a partial day below or at the goal", () => {
    expect(dayStatus(1500, true, 2000, true)).toBe("uncertain");
    expect(dayStatus(1500, false, 2000, true)).toBe("below");
    expect(dayStatus(2010, false, 2000, true)).toBe("at");
    expect(dayStatus(2100, true, 2000, true)).toBe("above");
    expect(dayStatus(null, true, 2000, true)).toBe("uncertain");
    expect(dayStatus(null, false, 2000, false)).toBe("none");
    expect(dayStatus(1500, false, null, true)).toBe("nogoal");
  });
});

describe("buildInsights", () => {
  const base = { range: "week" as const, anchor: "2026-11-14", today: "2026-11-14", goals };
  it("counts coverage and averages logged days only", () => {
    const result = buildInsights({ ...base, logs: [log("2026-11-14", 1000), log("2026-11-13", 2000)] });
    expect(result.elapsedDays).toBe(7);
    expect(result.loggedDays).toBe(2);
    expect(result.average.kcal).toBe(1500);
    expect(result.average.partial).toBe(false);
  });
  it("keeps unknown calories unknown and flags partial days", () => {
    const result = buildInsights({ ...base, logs: [log("2026-11-14", 500), log("2026-11-14", null), log("2026-11-13", null)] });
    const today = result.buckets.find((bucket) => bucket.key === "2026-11-14");
    const yesterday = result.buckets.find((bucket) => bucket.key === "2026-11-13");
    expect(today).toMatchObject({ kcal: 500, partial: true });
    expect(yesterday?.kcal).toBeNull();
    expect(result.average.partial).toBe(true);
    expect(result.unknownEntries).toBe(2);
  });
  it("does not count future days toward coverage", () => {
    const result = buildInsights({ ...base, range: "month", logs: [] });
    expect(result.elapsedDays).toBe(14);
    expect(result.buckets).toHaveLength(30);
  });
  it("groups meals, tags and top foods without turning unknown into zero", () => {
    const result = buildInsights({
      ...base,
      logs: [
        log("2026-11-14", 300, { tags: ["junk"], name_snapshot: "Samosa" }),
        log("2026-11-13", null, { tags: ["junk"], name_snapshot: "Samosa" }),
        log("2026-11-13", 200, { meal_type: "breakfast", name_snapshot: "Idli" }),
      ],
    });
    expect(result.tags).toEqual([{ tag: "junk", entries: 2, kcal: 300 }]);
    expect(result.meals.map((item) => item.meal)).toEqual(["breakfast", "lunch"]);
    expect(result.topFoods[0]).toEqual({ name: "Samosa", count: 2, kcal: 300 });
  });
  it("builds twelve monthly bars for a year", () => {
    const result = buildInsights({ ...base, range: "year", logs: [log("2026-11-14", 1800)] });
    expect(result.buckets).toHaveLength(12);
    expect(result.buckets[10].kcal).toBe(1800);
    expect(result.buckets[0].kcal).toBeNull();
  });
});
