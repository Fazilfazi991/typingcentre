import { describe, expect, it } from "vitest";
import { calculateDaysRemaining, determineExpiryStatus, expiryBucketFromQuery, getRelativeExpiryText } from "@/lib/dates/expiry";

const now = new Date("2026-08-05T12:00:00Z");
describe("expiry utilities", () => {
  it("handles today, tomorrow and yesterday", () => { expect(calculateDaysRemaining("2026-08-05", now)).toBe(0); expect(determineExpiryStatus("2026-08-06", false, now)).toBe("urgent"); expect(getRelativeExpiryText("2026-08-04", now)).toBe("Expired yesterday"); });
  it("handles month boundaries and leap years", () => { expect(calculateDaysRemaining("2024-02-29", new Date("2024-02-28T10:00:00Z"))).toBe(1); expect(calculateDaysRemaining("2026-09-01", new Date("2026-08-31T10:00:00Z"))).toBe(1); });
  it("recognises renewal and invalid input", () => { expect(determineExpiryStatus("2026-01-01", true, now)).toBe("renewal_in_progress"); expect(calculateDaysRemaining("bad-date", now)).toBeUndefined(); });
  it("keeps seven-day and days-eight-to-thirty URL buckets separate", () => {
    expect(expiryBucketFromQuery("expired")).toBe("expired");
    expect(expiryBucketFromQuery("7-days")).toBe("next-7-days");
    expect(expiryBucketFromQuery("30-days")).toBe("days-8-to-30");
    expect(expiryBucketFromQuery("unknown")).toBeUndefined();
    expect(determineExpiryStatus("2026-08-12", false, now)).toBe("urgent");
    expect(determineExpiryStatus("2026-08-13", false, now)).toBe("expiring_soon");
    expect(determineExpiryStatus("2026-09-05", false, now)).toBe("valid");
  });
});
