import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, redirect, rpc } = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ data: "organization-id", error: null }),
  getSupabaseServerClient: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));
vi.mock("@/lib/auth/destination", () => ({ resolveAuthDestination: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import { onboardAction } from "@/app/(auth)/actions";

describe("onboarding action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("converts the submitted checkbox value before calling the trusted RPC", async () => {
    getSupabaseServerClient.mockResolvedValue({ rpc });
    const form = new FormData();
    form.set("name", "Renewal QA");
    form.set("slug", "renewal-qa");
    form.set("location", "Dubai");
    form.set("email", "owner@example.com");
    form.set("phone", "+971500000001");
    form.set("whatsapp", "");
    form.set("address", "QA only");
    form.set("primaryColor", "#0E7BFF");
    form.set("acceptTerms", "true");

    await expect(onboardAction({}, form)).rejects.toThrow("REDIRECT:/onboarding/setup");
    expect(rpc).toHaveBeenCalledWith("onboard_current_user", expect.objectContaining({
      organization_name: "Renewal QA",
      organization_slug: "renewal-qa",
    }));
  });

  it("does not accept a missing terms checkbox", async () => {
    const result = await onboardAction({}, new FormData());
    expect(result).toEqual({ error: "Check the organization details and accept the terms." });
    expect(rpc).not.toHaveBeenCalled();
  });
});
