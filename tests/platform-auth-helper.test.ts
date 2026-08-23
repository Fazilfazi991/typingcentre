import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { getActivePlatformAdmin } from "@/lib/platform/auth";

function client(role: string, status = "active") {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { platform_role: role, status } }),
  };
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
    from: vi.fn().mockReturnValue(query),
  };
}

describe("active platform admin authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows an active platform admin", async () => {
    getSupabaseServerClient.mockResolvedValue(client("platform_admin"));
    await expect(getActivePlatformAdmin()).resolves.toMatchObject({ id: "user-id" });
  });

  it("denies an active tenant owner", async () => {
    getSupabaseServerClient.mockResolvedValue(client("none"));
    await expect(getActivePlatformAdmin()).resolves.toBeNull();
  });

  it("denies anonymous and inactive platform accounts", async () => {
    getSupabaseServerClient.mockResolvedValue(null);
    await expect(getActivePlatformAdmin()).resolves.toBeNull();
    getSupabaseServerClient.mockResolvedValue(client("platform_admin", "inactive"));
    await expect(getActivePlatformAdmin()).resolves.toBeNull();
  });
});
