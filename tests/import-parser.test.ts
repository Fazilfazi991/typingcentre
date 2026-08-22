import { describe, expect, it } from "vitest";
import { normalizePhone, parseImportDate, suggestField } from "@/lib/imports/parser";

describe("import normalization", () => {
  it("suggests common source columns", () => {
    expect(suggestField("Client Mobile")).toBe("customer_phone");
    expect(suggestField("Visa Exp")).toBe("expiry_date");
    expect(suggestField("Emirates ID Expiry")).toBe("expiry_date");
    expect(suggestField("Trade License Expiry")).toBe("expiry_date");
    expect(suggestField("An unrelated legacy reference")).toBeNull();
  });

  it("normalizes unambiguous UAE phones without inventing a country", () => {
    expect(normalizePhone("050 123 4567")).toBe("+971501234567");
    expect(normalizePhone("971501234567")).toBe("+971501234567");
    expect(normalizePhone("5551234")).toBeNull();
  });

  it("parses ISO and unambiguous day-first dates while flagging ambiguity", () => {
    expect(parseImportDate("2027-08-14")).toEqual({ value: "2027-08-14", ambiguous: false });
    expect(parseImportDate("14/08/2027")).toEqual({ value: "2027-08-14", ambiguous: false });
    expect(parseImportDate("03/04/2027")).toEqual({ value: null, ambiguous: true });
  });
});
