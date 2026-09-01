import { describe, expect, it, vi } from "vitest";

const { getClaims, getSupabaseServerClient, redirect } = vi.hoisted(() => {
  const getClaims = vi.fn().mockResolvedValue({ data: null });
  return {
    getClaims,
    getSupabaseServerClient: vi.fn().mockResolvedValue({ auth: { getClaims } }),
    redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  };
});

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));
vi.mock("next/navigation", () => ({ redirect }));

import { getWorkspaceContext } from "@/lib/workspace/context";

describe("unauthenticated workspace return", () => {
  it("redirects to login with the encoded renewals destination", async () => {
    await expect(getWorkspaceContext("/renewals?range=30d")).rejects.toThrow(
      "REDIRECT:/login?next=%2Frenewals%3Frange%3D30d",
    );
    expect(getClaims).toHaveBeenCalledOnce();
  });
});
