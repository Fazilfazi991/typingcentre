import { describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, getDemoCredentials, redirect, signInWithPassword } = vi.hoisted(() => {
  const signInWithPassword = vi.fn();
  return {
    getSupabaseServerClient: vi.fn().mockResolvedValue({ auth: { signInWithPassword } }),
    getDemoCredentials: vi.fn(),
    redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
    signInWithPassword,
  };
});

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));
vi.mock("@/lib/demo/workspace", () => ({ getDemoCredentials }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/destination", () => ({ resolveAuthDestination: vi.fn().mockResolvedValue("/dashboard") }));

import { demoLoginAction } from "@/app/(auth)/demo-actions";

describe("demo login", () => {
  it("authenticates only with server-provided credentials and always opens the dashboard", async () => {
    getDemoCredentials.mockReturnValue({ email: "demo@example.test", password: "not-in-the-browser" });
    signInWithPassword.mockResolvedValue({ error: null });

    await expect(demoLoginAction({}, new FormData())).rejects.toThrow("REDIRECT:/dashboard");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "demo@example.test", password: "not-in-the-browser" });
  });

  it("returns a generic error without attempting auth when demo configuration is absent", async () => {
    getDemoCredentials.mockReturnValue(null);
    await expect(demoLoginAction({}, new FormData())).resolves.toEqual({
      error: "Demo is temporarily unavailable. Please try again.",
    });
  });
});
