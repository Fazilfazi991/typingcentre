import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const runWhatsAppExpiryNotifications = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notifications/whatsapp-expiry", () => ({ runWhatsAppExpiryNotifications }));
import { GET } from "@/app/api/internal/whatsapp-expiry-notifications/route";

describe("WhatsApp expiry cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
  });

  it("rejects anonymous invocation without running the scheduler", async () => {
    const response = await GET(new NextRequest("https://noteitapp.com/api/internal/whatsapp-expiry-notifications"));
    expect(response.status).toBe(401);
    expect(runWhatsAppExpiryNotifications).not.toHaveBeenCalled();
  });

  it("runs only with the server cron credential", async () => {
    runWhatsAppExpiryNotifications.mockResolvedValue({ tenantsEvaluated: 2, eligible: 1, sent: 1, skipped: 1, failed: 0 });
    const response = await GET(new NextRequest("https://noteitapp.com/api/internal/whatsapp-expiry-notifications", { headers: { authorization: "Bearer cron-test-secret" } }));
    expect(response.status).toBe(200);
    expect(runWhatsAppExpiryNotifications).toHaveBeenCalledOnce();
  });
});
