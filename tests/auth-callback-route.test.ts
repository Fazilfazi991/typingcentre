import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, createServerClient } = vi.hoisted(() => {
  const exchange = vi.fn();
  return {
    exchangeCodeForSession: exchange,
    createServerClient: vi.fn(() => ({ auth: { exchangeCodeForSession: exchange } })),
  };
});

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@/lib/config/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" },
  supabasePublicKey: "fake-publishable-key",
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("exchanges a recovery code and redirects to the safe reset page", async () => {
    const request = new NextRequest("https://noteitapp.com/auth/callback?code=fake-code&next=/reset-password", {
      headers: { cookie: "fake-verifier=fake-value" },
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://noteitapp.com/reset-password");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("fake-code");
    const cookieAdapter = createServerClient.mock.calls[0]?.[2].cookies;
    expect(cookieAdapter.getAll()).toEqual(expect.arrayContaining([{ name: "fake-verifier", value: "fake-value" }]));
  });

  it("rejects external next destinations", async () => {
    const request = new NextRequest("https://noteitapp.com/auth/callback?code=fake-code&next=https://evil.example");
    const response = await GET(request);
    expect(response.headers.get("location")).toBe("https://noteitapp.com/dashboard");
  });
});
