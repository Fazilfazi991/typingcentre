import { describe, expect, it } from "vitest";
import { parseSupabaseSessionHash } from "@/lib/auth/url-session";

describe("parseSupabaseSessionHash", () => {
  it("extracts only the session credentials from a recovery fragment", () => {
    expect(parseSupabaseSessionHash("#access_token=fake-access&refresh_token=fake-refresh&type=recovery")).toEqual({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
    });
  });

  it("rejects incomplete and error fragments", () => {
    expect(parseSupabaseSessionHash("#error=access_denied&error_code=otp_expired")).toBeNull();
    expect(parseSupabaseSessionHash("#access_token=fake-access")).toBeNull();
    expect(parseSupabaseSessionHash("")) .toBeNull();
  });
});
