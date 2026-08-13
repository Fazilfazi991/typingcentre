import { describe, expect, it, vi } from "vitest";

const getSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { resolveAuthDestination } from "@/lib/auth/destination";

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
            : { id: "organization-id" };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
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
});
