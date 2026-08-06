import { describe, expect, it } from "vitest";
import {
  branchBelongsToCompany,
  customerArchiveSchema,
  customerCanMutate,
  customerDatabaseError,
  customerDetailPath,
  customerEditPath,
  isSafeUuid,
} from "@/features/crm/customer-utils";
import { branchSchema, companySchema, customerSchema, followUpSchema } from "@/features/crm/schemas";
import { listParams, maskEmiratesId, maskPassport, safeDatabaseError } from "@/lib/workspace/utils";

describe("Stage 5 CRM validation", () => {
  it("validates company and branch inputs", () => {
    expect(companySchema.safeParse({ name: "Al Noor", city: "Dubai" }).success).toBe(true);
    expect(companySchema.safeParse({ name: "A", city: "Dubai" }).success).toBe(false);
    expect(branchSchema.safeParse({ name: "Central", city: "Dubai", email: "not-an-email" }).success).toBe(false);
  });

  it("enforces customer branch and company relationships before database checks", () => {
    const branchId = "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0";
    expect(customerSchema.safeParse({ fullName: "Amina Test", customerType: "individual", phone: "+971500000000", branchId }).success).toBe(false);
    expect(customerSchema.safeParse({ fullName: "Amina Test", customerType: "individual", phone: "+971500000000", companyId: branchId, branchId }).success).toBe(true);
  });

  it("validates customer archive and safe UUID inputs", () => {
    const customerId = "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0";
    expect(customerArchiveSchema.safeParse({ customerId }).success).toBe(true);
    expect(customerArchiveSchema.safeParse({ customerId: "not-a-uuid" }).success).toBe(false);
    expect(isSafeUuid(customerId)).toBe(true);
    expect(isSafeUuid("not-a-uuid")).toBe(false);
  });

  it("checks customer company and branch relationship compatibility", () => {
    const companyId = "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0";
    expect(branchBelongsToCompany({ company_id: companyId }, companyId)).toBe(true);
    expect(branchBelongsToCompany({ company_id: companyId }, "a3a0c9d0-8903-4c46-a1fa-459c5a053e59")).toBe(false);
    expect(branchBelongsToCompany(null, companyId)).toBe(false);
  });

  it("validates follow-up timestamps", () => {
    expect(followUpSchema.safeParse({ customerId: "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0", dueAt: "2026-08-15T09:00:00.000Z" }).success).toBe(true);
    expect(followUpSchema.safeParse({ customerId: "invalid", dueAt: "tomorrow" }).success).toBe(false);
  });
});

describe("Stage 5 CRM display and list safety", () => {
  it("masks identity values", () => {
    expect(maskPassport("P1234567")).not.toContain("3456");
    expect(maskEmiratesId("784-1990-1234-567")).toBe("784-****-*******-7");
  });

  it("clamps list parameters to safe values", () => {
    const result = listParams({ page: "-2", pageSize: "999", search: "  al noor  ", sort: "drop table", direction: "up" }, ["name", "updated_at"]);
    expect(result).toEqual({ page: 1, pageSize: 20, search: "al noor", sort: "name", direction: "desc" });
  });

  it("maps database failures without exposing internals", () => {
    expect(safeDatabaseError({ code: "23505", message: "customers_active_passport_idx" })).toBe("A record with one of those unique details already exists.");
    expect(safeDatabaseError({ code: "XX000", message: "SQL details" })).toBe("We could not save that change. Please try again.");
  });

  it("maps customer-specific archive and duplicate errors safely", () => {
    expect(customerDatabaseError({ code: "23505", message: "customers_active_passport_idx" })).toBe("A customer with this passport number already exists.");
    expect(customerDatabaseError({ code: "23505", message: "customers_active_emirates_id_idx" })).toBe("A customer with this Emirates ID already exists.");
    expect(customerDatabaseError({ message: "Selected branch does not belong to the selected company" })).toBe("Select a branch that belongs to the selected company.");
    expect(customerDatabaseError({ message: "raw sql detail" })).toBeNull();
  });

  it("generates customer routes and hides archived mutation actions", () => {
    const customerId = "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0";
    expect(customerDetailPath(customerId)).toBe(`/customers/${customerId}`);
    expect(customerEditPath(customerId)).toBe(`/customers/${customerId}/edit`);
    expect(customerCanMutate({ archived_at: null })).toBe(true);
    expect(customerCanMutate({ archived_at: "2026-08-06T10:00:00.000Z" })).toBe(false);
  });
});
