import { describe, expect, it, vi } from "vitest";

const getSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { resolveAuthDestination } from "@/lib/auth/destination";
import { safeNext } from "@/lib/auth/validation";

function clientFor(platformRole: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-id", email: "user@example.com" } },
      }),
    },
    from: vi.fn((table: string) => {
      const data =
        table === "profiles"
          ? { platform_role: platformRole, status: "active" }
          : table === "organization_memberships"
            ? { organization_id: "organization-id", status: "active" }
            : { id: "organization-id", onboarding_completed_at: "2026-08-01T00:00:00.000Z" };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data }),
      };
    }),
  };
}

describe("auth destination", () => {
  it("routes only an active platform admin to the canonical admin area", async () => {
    getSupabaseServerClient.mockResolvedValue(clientFor("platform_admin"));
    await expect(resolveAuthDestination()).resolves.toBe("/admin");
  });

  it("keeps an active tenant owner in the tenant dashboard", async () => {
    getSupabaseServerClient.mockResolvedValue(clientFor("none"));
    await expect(resolveAuthDestination()).resolves.toBe("/dashboard");
  });

  it("preserves safe renewal destinations and rejects open-redirect forms", () => {
    expect(safeNext("/renewals?range=today")).toBe("/renewals?range=today");
    expect(safeNext("/renewals?range=7d")).toBe("/renewals?range=7d");
    expect(safeNext("/renewals?range=30d")).toBe("/renewals?range=30d");
    for (const unsafe of ["https://example.com", "//example.com", "/\\example.com", "/%2f%2fevil", "javascript:alert(1)", "/bad%zz"]) expect(safeNext(unsafe)).toBeUndefined();
  });
});
