import { describe, expect, it } from "vitest";
import { classifyFailure, parseQueue } from "./offline-queue";
const good = {
  userId: "u1",
  name: "Idli",
  queuedAt: "2026-11-18T10:00:00.000Z",
  payload: {
    id: "a",
    foodId: "f",
    quantity: 2,
    unit: "serving",
    mealType: "breakfast",
    consumedAt: "2026-11-18T09:00:00.000Z",
  },
};
const now = Date.parse("2026-11-18T12:00:00.000Z");
describe("offline queue", () => {
  it("reads valid entries and ignores junk", () => {
    expect(parseQueue(JSON.stringify([good]), now)).toHaveLength(1);
    expect(parseQueue("not json", now)).toEqual([]);
    expect(parseQueue(JSON.stringify({ a: 1 }), now)).toEqual([]);
    expect(
      parseQueue(JSON.stringify([{ ...good, payload: { id: "a" } }]), now),
    ).toEqual([]);
    expect(parseQueue(null, now)).toEqual([]);
  });
  it("drops entries older than 30 days", () => {
    expect(
      parseQueue(
        JSON.stringify([{ ...good, queuedAt: "2026-09-01T00:00:00.000Z" }]),
        now,
      ),
    ).toEqual([]);
  });
  it("keeps retrying when there is no answer, a server error or a signed-out session", () => {
    expect(classifyFailure(undefined)).toBe("retry");
    expect(classifyFailure(500)).toBe("retry");
    expect(classifyFailure(401)).toBe("retry");
    expect(classifyFailure(429)).toBe("retry");
  });
  it("treats a replay of a saved entry as done and a rejected entry as dropped", () => {
    expect(classifyFailure(409)).toBe("done");
    expect(classifyFailure(400, "That entry was already saved")).toBe("done");
    expect(classifyFailure(400, "Amount must be above zero")).toBe("drop");
  });
});
