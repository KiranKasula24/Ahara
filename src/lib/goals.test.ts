import { describe, expect, it } from "vitest";
import { versionIntakeGoal } from "./goals";

describe("goal versions", () => {
  it("closes the prior target and preserves it when a target changes", () => expect(versionIntakeGoal({ value: 2000, startsAt: "2026-10-01", endsAt: null }, 2200, "2026-10-25")).toEqual([{ value: 2000, startsAt: "2026-10-01", endsAt: "2026-10-25" }, { value: 2200, startsAt: "2026-10-25", endsAt: null }]));
  it("does not create a duplicate version for the same target", () => expect(versionIntakeGoal({ value: 2000, startsAt: "2026-10-01", endsAt: null }, 2000, "2026-10-25")).toHaveLength(1));
});
