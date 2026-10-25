import { expect, it } from "vitest";
import { deduplicateQueue } from "./offline-queue";
it("orders queued client IDs and never replays a duplicate", () => expect(deduplicateQueue([{ id: "b", createdAt: "2026-01-02", type: "log", payload: {} }, { id: "a", createdAt: "2026-01-01", type: "log", payload: {} }, { id: "b", createdAt: "2026-01-03", type: "log", payload: {} }]).map((item) => item.id)).toEqual(["a", "b"]));
