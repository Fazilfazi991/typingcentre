import { describe, expect, it } from "vitest";
import { activityPresentation, calculatePortfolioInsights, formatActivityTime, percentage } from "@/lib/dashboard/insights";

describe("dashboard portfolio insights", () => {
  const now = new Date("2026-08-13T05:00:00Z");

  it("builds exclusive health states and non-overlapping 90-day buckets", () => {
    const records = [
      { expires_on: "2026-08-12", status: "valid" },
      { expires_on: "2026-08-13", status: "valid" },
      { expires_on: "2026-09-12", status: "valid" },
      { expires_on: "2026-09-13", status: "valid" },
      { expires_on: "2026-10-12", status: "valid" },
      { expires_on: "2026-10-13", status: "valid" },
      { expires_on: "2026-11-11", status: "valid" },
      { expires_on: "2027-01-01", status: "renewal_in_progress" },
    ];
    expect(calculatePortfolioInsights(records, now, "Asia/Dubai")).toEqual({
      health: { valid: 4, expiringSoon: 2, expired: 1, renewalInProgress: 1 },
      total: 8,
      upcoming: { days0To30: 2, days31To60: 2, days61To90: 2 },
      upcomingTotal: 6,
    });
  });

  it("handles empty totals and derives activity presentation from live event text", () => {
    expect(percentage(0, 0)).toBe(0);
    expect(activityPresentation("follow_up", "Follow-up completed")).toEqual({ tone: "teal", icon: "check" });
    expect(activityPresentation("customer", "New customer added")).toEqual({ tone: "purple", icon: "user" });
    expect(formatActivityTime("2026-08-13T04:48:00Z", now)).toBe("12 minutes ago");
  });
});
