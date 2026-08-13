import { describe, expect, it } from "vitest";
import { applyRenewalRange, calculateDaysRemaining, determineExpiryStatus, dubaiDateTimeLocalValue, dubaiDateTimeToUtcISOString, expiryBucketFromQuery, expiryDigestBucketForDays, getRelativeExpiryText, renewalRangeFromQuery, renewalRangePath } from "@/lib/dates/expiry";

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
  it("uses Asia/Dubai for date boundaries and datetime-local conversions", () => {
    expect(calculateDaysRemaining("2026-08-10", new Date("2026-08-09T20:30:00Z"))).toBe(0);
    expect(dubaiDateTimeToUtcISOString("2026-08-15T09:00")).toBe("2026-08-15T05:00:00.000Z");
    expect(dubaiDateTimeLocalValue("2026-08-15T05:00:00.000Z")).toBe("2026-08-15T09:00");
  });
  it("uses one canonical set of cumulative renewal attention windows", () => {
    const calls: Array<[string, string]> = [];
    const query = {
      gte: (column: string, value: string) => (calls.push([`gte:${column}`, value]), query),
      lt: (column: string, value: string) => (calls.push([`lt:${column}`, value]), query),
    };
    applyRenewalRange(query, "expired", now);
    applyRenewalRange(query, "today", now);
    applyRenewalRange(query, "7d", now);
    applyRenewalRange(query, "30d", now);
    applyRenewalRange(query, "90d", now);
    expect(calls).toEqual([
      ["lt:expires_on", "2026-08-05"],
      ["gte:expires_on", "2026-08-05"], ["lt:expires_on", "2026-08-06"],
      ["gte:expires_on", "2026-08-05"], ["lt:expires_on", "2026-08-13"],
      ["gte:expires_on", "2026-08-05"], ["lt:expires_on", "2026-09-05"],
      ["gte:expires_on", "2026-08-05"], ["lt:expires_on", "2026-11-04"],
    ]);
    expect([-1, 0, 1, 7, 8, 30, 31].map(expiryDigestBucketForDays)).toEqual([undefined, "today", "next7Days", "next7Days", "next30Days", "next30Days", undefined]);
  });
  it("accepts only stable renewal query values", () => {
    expect(renewalRangeFromQuery("expired")).toBe("expired");
    expect(renewalRangeFromQuery("today")).toBe("today");
    expect(renewalRangeFromQuery("7d")).toBe("7d");
    expect(renewalRangeFromQuery("30d")).toBe("30d");
    expect(renewalRangeFromQuery("90d")).toBe("90d");
    expect(renewalRangeFromQuery("tenant-a")).toBeUndefined();
    expect(renewalRangePath("7d")).toBe("/renewals?range=7d");
    expect(renewalRangePath("expired")).toBe("/renewals?range=expired");
  });
});
