import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { POST } from "@/app/api/admin/whatsapp/test/route";

describe("WhatsApp admin test route", () => {
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
});
