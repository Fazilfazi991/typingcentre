import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getActivePlatformAdmin: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  inspectWhatsAppManagement: vi.fn(),
  sendWhatsAppTemplateMessage: vi.fn(),
  sendDocumentExpirySummaryV2: vi.fn(),
}));

vi.mock("@/lib/platform/auth", () => ({ getActivePlatformAdmin: mocks.getActivePlatformAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: mocks.getSupabaseAdminClient }));
vi.mock("@/lib/whatsapp/management", () => ({ inspectWhatsAppManagement: mocks.inspectWhatsAppManagement }));
vi.mock("@/lib/whatsapp/expiry-template-v2", () => ({ sendDocumentExpirySummaryV2: mocks.sendDocumentExpirySummaryV2 }));
vi.mock("@/lib/whatsapp/sender", () => ({
  normalizeWhatsAppRecipient: (value: string) => /^\+[1-9][0-9]{7,14}$/.test(value) ? value : null,
  sendWhatsAppTemplateMessage: mocks.sendWhatsAppTemplateMessage,
}));

import { GET, POST } from "@/app/api/admin/whatsapp/test/route";

const approvedTemplates = [
  { name: "hello_world", language: "en_US", status: "APPROVED", category: "UTILITY" },
  { name: "document_expiry_summary", language: "en", status: "APPROVED", category: "UTILITY" },
  { name: "document_expiry_summary_v2", language: "en", status: "APPROVED", category: "UTILITY" },
];

function adminStore() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain), chain };
}

function request(recipient: string, templateName = "document_expiry_summary_v2") {
  return new NextRequest("https://noteitapp.com/api/admin/whatsapp/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient, templateName }),
  });
}

describe("WhatsApp admin test route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActivePlatformAdmin.mockResolvedValue({ id: `admin-${Math.random()}` });
    mocks.getSupabaseAdminClient.mockReturnValue(adminStore());
    mocks.inspectWhatsAppManagement.mockResolvedValue({ matchingTemplates: approvedTemplates });
    mocks.sendWhatsAppTemplateMessage.mockResolvedValue({ success: true, messageId: "wamid.test", responseStatus: 200 });
    mocks.sendDocumentExpirySummaryV2.mockResolvedValue({ success: true, messageId: "wamid.v2", responseStatus: 200 });
  });

  it("rejects anonymous requests before attempting a send", async () => {
    mocks.getActivePlatformAdmin.mockResolvedValue(null);
    const response = await POST(request("+971501234567"));
    expect(response.status).toBe(401);
    expect(mocks.sendWhatsAppTemplateMessage).not.toHaveBeenCalled();
    expect(mocks.sendDocumentExpirySummaryV2).not.toHaveBeenCalled();
  });

  it("rejects tenant users and exposes no runtime configuration", async () => {
    mocks.getActivePlatformAdmin.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns boolean-only runtime status and isolated history to a platform admin", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.configuration).toEqual({
      WHATSAPP_ACCESS_TOKEN: expect.any(Boolean),
      WHATSAPP_PHONE_NUMBER_ID: expect.any(Boolean),
      WHATSAPP_BUSINESS_ACCOUNT_ID: expect.any(Boolean),
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: expect.any(Boolean),
    });
    expect(payload.history).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain("test-token");
  });

  it("accepts an E.164 recipient with + and normalizes whitespace", async () => {
    const response = await POST(request(" +971 501234567 ", "hello_world"));
    expect(response.status).toBe(200);
    expect(mocks.sendWhatsAppTemplateMessage).toHaveBeenCalledWith({
      to: "+971501234567",
      templateName: "hello_world",
      languageCode: "en_US",
      components: undefined,
    });
  });

  it("rejects a recipient missing + before any sender call", async () => {
    const response = await POST(request("971501234567"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      failureType: "validation",
      error: "Recipient must be in E.164 format and start with +.",
    });
    expect(mocks.sendWhatsAppTemplateMessage).not.toHaveBeenCalled();
  });

  it("sends v1 with the fixed QA parameters in exact order", async () => {
    const response = await POST(request("+971501234567", "document_expiry_summary"));
    expect(response.status).toBe(200);
    expect(mocks.sendWhatsAppTemplateMessage).toHaveBeenCalledWith({
      to: "+971501234567",
      templateName: "document_expiry_summary",
      languageCode: "en",
      components: [{ type: "body", parameters: [
        { type: "text", text: "Al Noor Typing Centre" },
        { type: "text", text: "10" },
        { type: "text", text: "2" },
        { type: "text", text: "5" },
        { type: "text", text: "3" },
      ] }],
    });
  });

  it("uses the existing V2 helper with Graph-resolved language", async () => {
    const response = await POST(request("+971501234567"));
    expect(response.status).toBe(200);
    expect(mocks.sendDocumentExpirySummaryV2).toHaveBeenCalledWith({
      recipient: "+971501234567",
      tenantName: "Al Noor Typing Centre",
      total: 10,
      today: 2,
      next7: 5,
      next30: 3,
      approvedLanguageCode: "en",
    });
  });

  it("disables sending server-side when Graph readiness is unresolved", async () => {
    mocks.inspectWhatsAppManagement.mockResolvedValue({ matchingTemplates: [] });
    const response = await POST(request("+971501234567"));
    expect(response.status).toBe(412);
    expect(mocks.sendDocumentExpirySummaryV2).not.toHaveBeenCalled();
  });

  it("surfaces the 3-per-15-minute rate limit without a fourth send", async () => {
    mocks.getActivePlatformAdmin.mockResolvedValue({ id: "rate-limited-admin" });
    for (let index = 0; index < 3; index++)
      expect((await POST(request("+971501234567", "hello_world"))).status).toBe(200);
    const response = await POST(request("+971501234567", "hello_world"));
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ failureType: "rate_limit" });
    expect(mocks.sendWhatsAppTemplateMessage).toHaveBeenCalledTimes(3);
  });

  it("returns a sanitized Meta rejection and records only the masked recipient", async () => {
    mocks.sendWhatsAppTemplateMessage.mockResolvedValue({
      success: false,
      responseStatus: 400,
      error: { type: "meta_api", code: 131026, title: "Undeliverable", message: "Message undeliverable.", details: "Check recipient." },
    });
    const store = adminStore();
    mocks.getSupabaseAdminClient.mockReturnValue(store);
    const response = await POST(request("+971501234567", "hello_world"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ failureType: "meta", recipientMasked: "+971******4567" });
    expect(store.chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      recipient_masked: "+971******4567",
      meta_error_code: 131026,
    }));
    expect(JSON.stringify(store.chain.insert.mock.calls)).not.toContain("+971501234567");
  });
});
