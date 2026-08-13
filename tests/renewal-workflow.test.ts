import { describe, expect, it } from "vitest";
import {
  appendRenewalNote,
  renewalDetailPath,
  renewalRangeOrDefault,
  renewalRemainingText,
  renewalReturnPath,
  workflowStatus,
} from "@/lib/renewals/workflow";

describe("renewal workflow helpers", () => {
  it("preserves the canonical list context in detail and return links", () => {
    expect(renewalDetailPath("document-1", "7d")).toBe("/renewals/document-1?range=7d");
    expect(renewalReturnPath("expired")).toBe("/renewals?range=expired");
    expect(renewalRangeOrDefault("tenant-b")).toBe("30d");
  });

  it("derives workflow status in terminal-first priority order", () => {
    expect(workflowStatus({ renewalStatus: "completed", hasPendingFollowUp: true })).toBe("Renewed");
    expect(workflowStatus({ renewalStatus: "cancelled", hasContactActivity: true })).toBe("Closed");
    expect(workflowStatus({ renewalStatus: "submitted" })).toBe("Submitted");
    expect(workflowStatus({ hasPendingFollowUp: true })).toBe("Follow-up");
    expect(workflowStatus({ renewalStatus: "in_progress" })).toBe("Contacted");
    expect(workflowStatus({})).toBe("Pending");
  });

  it("retains notes and renders exact expiry edge cases", () => {
    expect(appendRenewalNote("First", " Second ")).toBe("First\nSecond");
    expect(renewalRemainingText(undefined)).toBe("Expiry unavailable");
    expect(renewalRemainingText(-1)).toBe("Expired 1 day ago");
    expect(renewalRemainingText(0)).toBe("Expires today");
    expect(renewalRemainingText(1)).toBe("1 day remaining");
  });
});
