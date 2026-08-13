import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dispatchWhatsAppExpiryForTenant,
  cumulativeRenewalCounts,
  isRetryableWhatsAppFailure,
  isWithinWhatsAppDeliveryWindow,
  tenantLocalSchedule,
  type WhatsAppTenant,
} from "@/lib/notifications/whatsapp-expiry";
import { buildDocumentExpirySummaryComponents } from "@/lib/whatsapp/expiry-template";

const now = new Date("2026-08-13T05:00:00Z");
const tenant: WhatsAppTenant = {
  id: "tenant-a",
  name: "Al Noor Typing Centre",
  timezone: "Asia/Dubai",
  whatsapp_notifications_enabled: true,
  whatsapp_recipient_phone: "+971501234567",
  whatsapp_notification_time: "09:00",
};
const counts = { today: 2, next7Days: 7, next30Days: 10, total: 10 };

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    getSummary: vi.fn().mockResolvedValue(counts),
    claim: vi.fn().mockResolvedValue("log-id"),
    send: vi.fn().mockResolvedValue({ success: true, responseStatus: 200, messageId: "wamid.1" }),
    recordAccepted: vi.fn().mockResolvedValue(undefined),
    recordFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe("tenant WhatsApp expiry dispatcher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the tenant timezone at a UTC date boundary", () => {
    expect(tenantLocalSchedule(new Date("2026-08-12T20:05:00Z"), "Asia/Dubai")).toEqual({ date: "2026-08-13", time: "00:05" });
    expect(tenantLocalSchedule(new Date("2026-08-12T20:05:00Z"), "Asia/Kolkata")).toEqual({ date: "2026-08-13", time: "01:35" });
  });

  it("accepts the bounded retry window after the configured time", () => {
    expect(isWithinWhatsAppDeliveryWindow("09:00", "09:00")).toBe(true);
    expect(isWithinWhatsAppDeliveryWindow("09:14", "09:00")).toBe(true);
    expect(isWithinWhatsAppDeliveryWindow("09:15", "09:00")).toBe(true);
    expect(isWithinWhatsAppDeliveryWindow("09:59", "09:00")).toBe(true);
    expect(isWithinWhatsAppDeliveryWindow("10:00", "09:00")).toBe(false);
    expect(isWithinWhatsAppDeliveryWindow("08:59", "09:00")).toBe(false);
  });

  it.each([
    [{ whatsapp_notifications_enabled: false }, "skipped_disabled"],
    [{ whatsapp_recipient_phone: null }, "skipped_no_recipient"],
    [{ whatsapp_recipient_phone: "0501234567" }, "skipped_no_recipient"],
    [{ whatsapp_notification_time: "10:00" }, "skipped_wrong_time"],
  ])("skips ineligible tenant configuration", async (override, action) => {
    const deps = dependencies();
    await expect(dispatchWhatsAppExpiryForTenant({ ...tenant, ...override }, now, deps)).resolves.toMatchObject({ action });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("skips zero-expiry summaries before claiming or sending", async () => {
    const deps = dependencies({ getSummary: vi.fn().mockResolvedValue({ today: 0, next7Days: 0, next30Days: 0, total: 0 }) });
    await expect(dispatchWhatsAppExpiryForTenant(tenant, now, deps)).resolves.toMatchObject({ action: "skipped_zero_expiry" });
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("records one eligible Meta acceptance", async () => {
    const deps = dependencies();
    await expect(dispatchWhatsAppExpiryForTenant(tenant, now, deps)).resolves.toEqual({ action: "accepted", localDate: "2026-08-13", messageId: "wamid.1" });
    expect(deps.claim).toHaveBeenCalledWith(tenant, "2026-08-13", counts);
    expect(deps.send).toHaveBeenCalledOnce();
    expect(deps.recordAccepted).toHaveBeenCalledOnce();
  });

  it("does not resend when the atomic daily claim already exists", async () => {
    const deps = dependencies({ claim: vi.fn().mockResolvedValue(null) });
    await expect(dispatchWhatsAppExpiryForTenant(tenant, now, deps)).resolves.toMatchObject({ action: "skipped_already_sent" });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("allows only one send across concurrent duplicate invocations", async () => {
    let claimed = false;
    const deps = dependencies({ claim: vi.fn(async () => claimed ? null : (claimed = true, "log-id")) });
    const results = await Promise.all([dispatchWhatsAppExpiryForTenant(tenant, now, deps), dispatchWhatsAppExpiryForTenant(tenant, now, deps)]);
    expect(results.map((result) => result.action).sort()).toEqual(["accepted", "skipped_already_sent"]);
    expect(deps.send).toHaveBeenCalledOnce();
  });

  it("records a sanitized Meta failure without retrying", async () => {
    const failed = { success: false, responseStatus: 400, error: { type: "meta_api", code: 132001, message: "Template unavailable" } };
    const deps = dependencies({ send: vi.fn().mockResolvedValue(failed) });
    await expect(dispatchWhatsAppExpiryForTenant(tenant, now, deps)).resolves.toMatchObject({ action: "failed" });
    expect(deps.recordFailed).toHaveBeenCalledWith("log-id", failed);
    expect(deps.send).toHaveBeenCalledOnce();
  });

  it("matches cumulative dashboard boundaries without double-counting total documents", () => {
    const document = (daysRemaining: number) => ({
      subjectName: "QA",
      documentType: "QA document",
      expiresOn: "2026-08-13",
      daysRemaining,
    });
    expect(cumulativeRenewalCounts({
      today: [document(0)],
      next7Days: [document(1), document(7)],
      next30Days: [document(8), document(30)],
    })).toEqual({ today: 1, next7Days: 3, next30Days: 5, total: 5 });
  });

  it("retries only transient failures", () => {
    expect(isRetryableWhatsAppFailure({ success: false, error: { type: "network", message: "offline" } })).toBe(true);
    expect(isRetryableWhatsAppFailure({ success: false, responseStatus: 429, error: { type: "meta_api", message: "rate limited" } })).toBe(true);
    expect(isRetryableWhatsAppFailure({ success: false, responseStatus: 400, error: { type: "meta_api", code: 132001, message: "template unavailable" } })).toBe(false);
  });

  it("keeps template body parameters in the approved order", () => {
    expect(buildDocumentExpirySummaryComponents(tenant.name, counts)).toEqual([{ type: "body", parameters: [
      { type: "text", text: "Al Noor Typing Centre" },
      { type: "text", text: "10" },
      { type: "text", text: "2" },
      { type: "text", text: "7" },
      { type: "text", text: "10" },
    ] }]);
  });
});
