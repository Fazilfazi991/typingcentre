import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { GET, POST } from "@/app/api/admin/whatsapp/test/route";

describe("WhatsApp admin test route", () => {
  function authenticatedClient(platformRole: string) {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { platform_role: platformRole, status: "active" },
      }),
    };
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
      from: vi.fn().mockReturnValue(query),
    };
  }

  it("rejects anonymous requests before attempting a send", async () => {
    getSupabaseServerClient.mockResolvedValue(null);
    const response = await POST(
      new NextRequest("https://noteitapp.com/api/admin/whatsapp/test", {
        method: "POST",
        body: JSON.stringify({ recipient: "+971501234567", message: "Test" }),
      }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("does not expose configuration status to anonymous requests", async () => {
    getSupabaseServerClient.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("rejects an authenticated tenant owner without the platform role", async () => {
    getSupabaseServerClient.mockResolvedValue(authenticatedClient("none"));
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("allows an active platform admin to read boolean-only configuration status", async () => {
    getSupabaseServerClient.mockResolvedValue(authenticatedClient("platform_admin"));
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      configuration: {
        WHATSAPP_ACCESS_TOKEN: expect.any(Boolean),
        WHATSAPP_PHONE_NUMBER_ID: expect.any(Boolean),
        WHATSAPP_BUSINESS_ACCOUNT_ID: expect.any(Boolean),
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: expect.any(Boolean),
      },
    });
  });
});
