import { describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, redirect } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));
vi.mock("next/navigation", () => ({ redirect }));

import { getWorkspaceContext } from "@/lib/workspace/context";

describe("unauthenticated workspace return", () => {
  it("redirects to login with the encoded renewals destination", async () => {
    await expect(getWorkspaceContext("/renewals?range=30d")).rejects.toThrow(
      "REDIRECT:/login?next=%2Frenewals%3Frange%3D30d",
    );
  });
});
