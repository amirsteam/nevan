import { describe, it, expect } from "vitest";
import { openStatus } from "./openingHours";

// Nepal is UTC+5:45, so 10:00 in Kathmandu is 04:15 UTC
const nepal = (isoLocal: string) => new Date(`${isoLocal}+05:45`);

describe("openStatus (Nepal time, Sunday–Friday 10am–7pm)", () => {
  it("is open during the day", () => {
    // 2026-10-15 is a Thursday
    expect(openStatus(nepal("2026-10-15T10:00:00"))).toEqual({ open: true, label: "Open now · until 7pm" });
    expect(openStatus(nepal("2026-10-15T18:59:00")).open).toBe(true);
  });

  it("says when it opens next", () => {
    expect(openStatus(nepal("2026-10-15T08:30:00")).label).toBe("Closed · opens today at 10am");
    expect(openStatus(nepal("2026-10-15T19:00:00")).label).toBe("Closed · opens tomorrow at 10am");
    // Friday evening and Saturday: Saturday is the day off
    expect(openStatus(nepal("2026-10-16T20:00:00")).label).toBe("Closed · opens Sunday at 10am");
    expect(openStatus(nepal("2026-10-17T12:00:00")).label).toBe("Closed · opens tomorrow at 10am");
  });

  it("uses Nepal time whatever the visitor's time zone", () => {
    // 11:00 in Kathmandu is still 05:15 UTC on the same Thursday
    expect(openStatus(new Date("2026-10-15T05:15:00Z")).open).toBe(true);
  });
});
