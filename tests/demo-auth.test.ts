import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, getDemoCredentials, getUser, signInWithPassword, maybeSingle } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getDemoCredentials: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@/lib/demo/workspace", () => ({ getDemoCredentials, isDemoOrganizationSlug: (slug?: string) => slug === "note-it-demo" }));
vi.mock("@/lib/config/env.public", () => ({
  hasSupabaseConfiguration: true,
  publicEnv: { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" },
  supabasePublicKey: "publishable-key",
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/demo/route";

describe("GET /demo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn(() => query), maybeSingle };
    createServerClient.mockReturnValue({ auth: { getUser, signInWithPassword }, from: vi.fn(() => query) });
    getUser.mockResolvedValue({ data: { user: null } });
    getDemoCredentials.mockReturnValue({ email: "demo@example.test", password: "server-only" });
    signInWithPassword.mockResolvedValue({ error: null });
  });

  it("signs a logged-out visitor in with server-only credentials", async () => {
    const response = await GET(new NextRequest("https://note-it.test/demo"));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "demo@example.test", password: "server-only" });
    expect(response.headers.get("location")).toBe("https://note-it.test/dashboard");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not replace an existing authenticated session", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
    maybeSingle.mockResolvedValue({ data: { organizations: { slug: "customer-workspace" } } });
    const response = await GET(new NextRequest("https://note-it.test/demo"));
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://note-it.test/demo/switch");
  });

  it("returns an existing Demo session to its dashboard", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "demo-user" } } });
    maybeSingle.mockResolvedValue({ data: { organizations: { slug: "note-it-demo" } } });
    const response = await GET(new NextRequest("https://note-it.test/demo"));
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://note-it.test/dashboard");
  });

  it("shows an intentional unavailable state when credentials are absent", async () => {
    getDemoCredentials.mockReturnValue(null);
    const response = await GET(new NextRequest("https://note-it.test/demo"));
    expect(response.headers.get("location")).toBe("https://note-it.test/demo/unavailable");
  });
});
