import { describe, expect, it } from "vitest";
import { isValidTimeZone, localDate, localTime, shiftDate, zonedDateTimeToInstant } from "./dates";

describe("dates", () => {
  it("uses the profile time zone, not the server's, around midnight", () => {
    expect(localDate("Asia/Kolkata", new Date("2026-11-08T18:20:00Z"))).toBe("2026-11-08"); // 11:50 pm IST
    expect(localDate("Asia/Kolkata", new Date("2026-11-08T18:40:00Z"))).toBe("2026-11-09"); // 12:10 am IST
    expect(localDate("UTC", new Date("2026-11-08T18:40:00Z"))).toBe("2026-11-08");
  });
  it("shifts calendar dates across month and leap boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("validates time zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });
  it("formats the local time", () => {
    expect(localTime("Asia/Kolkata", new Date("2026-11-08T18:20:00Z"))).toBe("23:50");
    expect(localTime("Asia/Kolkata", new Date("2026-11-08T18:40:00Z"))).toBe("00:10");
  });
  it("turns a local date and time into the right instant", () => {
    expect(zonedDateTimeToInstant("2026-11-08", "23:50", "Asia/Kolkata").toISOString()).toBe("2026-11-08T18:20:00.000Z");
    expect(zonedDateTimeToInstant("2026-11-09", "00:10", "Asia/Kolkata").toISOString()).toBe("2026-11-08T18:40:00.000Z");
    expect(zonedDateTimeToInstant("2026-07-01", "12:00", "Europe/London").toISOString()).toBe("2026-07-01T11:00:00.000Z");
  });
});
