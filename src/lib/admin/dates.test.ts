import { describe, expect, it } from "vitest";

import { businessDaysBetween, periodRange } from "@/lib/admin/dates";

// Melbourne is UTC+11 in November (daylight saving).
const mel = (iso: string) => new Date(`${iso}+11:00`);

describe("businessDaysBetween", () => {
  it("counts weekdays after the start day", () => {
    expect(businessDaysBetween(mel("2026-11-02T10:00"), mel("2026-11-02T22:00"))).toBe(0); // Mon
    expect(businessDaysBetween(mel("2026-11-02T10:00"), mel("2026-11-04T09:00"))).toBe(2);
  });
  it("skips the weekend", () => {
    // Friday → Monday = 1, Friday → Sunday = 0
    expect(businessDaysBetween(mel("2026-11-06T15:00"), mel("2026-11-09T08:00"))).toBe(1);
    expect(businessDaysBetween(mel("2026-11-06T15:00"), mel("2026-11-08T08:00"))).toBe(0);
  });
  it("uses the Melbourne date, not UTC", () => {
    // 23:30 Monday Melbourne is still Monday UTC morning; 00:30 Tuesday Melbourne is Monday UTC.
    expect(businessDaysBetween(mel("2026-11-02T23:30"), mel("2026-11-03T00:30"))).toBe(1);
  });
});

describe("periodRange", () => {
  it("week starts Monday 00:00 Melbourne", () => {
    const { start, end } = periodRange("week", mel("2026-11-05T12:00")); // Thursday
    expect(start.toISOString()).toBe("2026-11-01T13:00:00.000Z"); // Mon 2 Nov 00:00 +11
    expect(end.toISOString()).toBe("2026-11-08T13:00:00.000Z");
  });
  it("Monday early morning belongs to the new week", () => {
    const { start } = periodRange("week", mel("2026-11-09T00:30"));
    expect(start.toISOString()).toBe("2026-11-08T13:00:00.000Z");
  });
  it("month and last month", () => {
    const now = mel("2026-11-15T12:00");
    expect(periodRange("month", now).start.toISOString()).toBe("2026-10-31T13:00:00.000Z");
    expect(periodRange("month", now).end.toISOString()).toBe("2026-11-30T13:00:00.000Z");
    expect(periodRange("lastMonth", now).start.toISOString()).toBe("2026-09-30T14:00:00.000Z"); // +10 before DST
  });
  it("January's last month is December", () => {
    const { start, end } = periodRange("lastMonth", mel("2027-01-10T12:00"));
    expect(start.toISOString()).toBe("2026-11-30T13:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T13:00:00.000Z");
  });
});
