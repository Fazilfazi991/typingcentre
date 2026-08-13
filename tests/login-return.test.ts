import { describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, redirect } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) },
  }),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));
vi.mock("@/lib/auth/destination", () => ({ resolveAuthDestination: vi.fn().mockResolvedValue("/dashboard") }));
vi.mock("next/navigation", () => ({ redirect }));

import { loginAction } from "@/app/(auth)/actions";

describe("login return URL", () => {
  it("returns to the exact filtered renewals view after password login", async () => {
    const form = new FormData();
    form.set("email", "owner@example.com");
    form.set("password", "password123");
    form.set("next", "/renewals?range=7d");
    await expect(loginAction({}, form)).rejects.toThrow("REDIRECT:/renewals?range=7d");
  });

  it("returns to today’s filtered follow-up view after password login", async () => {
    const form = new FormData();
    form.set("email", "owner@example.com");
    form.set("password", "password123");
    form.set("next", "/follow-ups?date=today");
    await expect(loginAction({}, form)).rejects.toThrow("REDIRECT:/follow-ups?date=today");
  });
});
