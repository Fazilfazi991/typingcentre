import { describe, expect, it, vi } from "vitest";

const getSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { resolveAuthDestination } from "@/lib/auth/destination";

function clientFor(platformRole: string, onboardingCompletedAt: string | null = "2026-09-02T00:00:00Z") {
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
            : { id: "organization-id", onboarding_completed_at: onboardingCompletedAt };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data }),
      };
    }),
  };
}

describe("auth destination", () => {
  it("routes only an active platform admin to the platform area", async () => {
    getSupabaseServerClient.mockResolvedValue(clientFor("platform_admin"));
    await expect(resolveAuthDestination()).resolves.toBe("/platform");
  });

  it("keeps an active tenant owner in the tenant dashboard", async () => {
    getSupabaseServerClient.mockResolvedValue(clientFor("none"));
    await expect(resolveAuthDestination()).resolves.toBe("/dashboard");
  });

  it("resumes an incomplete workspace at its persisted setup route", async () => {
    getSupabaseServerClient.mockResolvedValue(clientFor("none", null));
    await expect(resolveAuthDestination()).resolves.toBe("/onboarding/setup");
  });
});
