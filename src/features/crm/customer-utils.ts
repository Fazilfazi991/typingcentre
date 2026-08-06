import { z } from "zod";

export const customerIdSchema = z.string().uuid();

export const customerArchiveSchema = z.object({
  customerId: customerIdSchema,
});

export function isSafeUuid(value: string | undefined | null) {
  return customerIdSchema.safeParse(value).success;
}

export function customerDetailPath(customerId: string) {
  return `/customers/${customerId}`;
}

export function customerEditPath(customerId: string) {
  return `/customers/${customerId}/edit`;
}

export function customerCanMutate(customer: { archived_at: string | null }) {
  return !customer.archived_at;
}

export function branchBelongsToCompany(
  branch: { company_id: string } | null | undefined,
  companyId: string | null | undefined,
) {
  return Boolean(branch && companyId && branch.company_id === companyId);
}

export function customerDatabaseError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message ?? "";

  if (error?.code === "23505" && message.includes("customers_active_passport_idx")) {
    return "A customer with this passport number already exists.";
  }

  if (error?.code === "23505" && message.includes("customers_active_emirates_id_idx")) {
    return "A customer with this Emirates ID already exists.";
  }

  if (message.includes("A company is required when selecting a branch")) {
    return "Select a company before selecting a branch.";
  }

  if (message.includes("Selected branch does not belong to the selected company")) {
    return "Select a branch that belongs to the selected company.";
  }

  return null;
}
