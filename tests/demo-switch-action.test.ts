import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, getDemoCredentials, redirect, signOut, signInWithPassword } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  getDemoCredentials: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));
vi.mock("@/lib/demo/workspace", () => ({ getDemoCredentials }));

import { switchToDemoAction } from "@/app/demo/actions";

describe("switchToDemoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClient.mockResolvedValue({ auth: { signOut, signInWithPassword } });
    getDemoCredentials.mockReturnValue({ email: "demo@example.test", password: "server-only" });
    signOut.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: null });
  });

  it("establishes the Demo session before redirecting to its dashboard", async () => {
    await expect(switchToDemoAction()).rejects.toThrow("REDIRECT:/dashboard");
    expect(signOut).toHaveBeenCalledOnce();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "demo@example.test", password: "server-only" });
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(signInWithPassword.mock.invocationCallOrder[0]);
  });

  it("uses the intentional unavailable state when Demo credentials are absent", async () => {
    getDemoCredentials.mockReturnValue(null);
    await expect(switchToDemoAction()).rejects.toThrow("REDIRECT:/demo/unavailable");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
