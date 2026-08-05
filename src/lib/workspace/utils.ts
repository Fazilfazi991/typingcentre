export const PAGE_SIZES = [20, 50, 100] as const;
export type SortDirection = "asc" | "desc";

export function listParams(input: Record<string, string | string[] | undefined>, allowedSorts: readonly string[]) {
  const rawPage = Number(Array.isArray(input.page) ? input.page[0] : input.page);
  const rawSize = Number(Array.isArray(input.pageSize) ? input.pageSize[0] : input.pageSize);
  const search = String(Array.isArray(input.search) ? input.search[0] : input.search ?? "").trim().slice(0, 80);
  const sort = String(Array.isArray(input.sort) ? input.sort[0] : input.sort ?? allowedSorts[0]);
  const direction = String(Array.isArray(input.direction) ? input.direction[0] : input.direction ?? "desc") === "asc" ? "asc" : "desc";
  return { page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1, pageSize: PAGE_SIZES.includes(rawSize as 20 | 50 | 100) ? rawSize : 20, search, sort: allowedSorts.includes(sort) ? sort : allowedSorts[0], direction: direction as SortDirection };
}

export function maskPassport(value: string | null) {
  if (!value) return "Not recorded";
  return value.length < 5 ? "Hidden" : `${value.slice(0, 2)}${"*".repeat(Math.max(3, value.length - 4))}${value.slice(-2)}`;
}

export function maskEmiratesId(value: string | null) {
  if (!value) return "Not recorded";
  const digits = value.replace(/\D/g, "");
  return digits.length < 4 ? "Hidden" : `${digits.slice(0, 3)}-****-*******-${digits.slice(-1)}`;
}

export function safeDatabaseError(error: { code?: string; message?: string } | null | undefined) {
  if (error?.code === "23505") return "A record with one of those unique details already exists.";
  if (error?.code === "42501") return "You do not have permission to perform this action.";
  if (error?.code === "23503") return "The selected related record is unavailable.";
  return "We could not save that change. Please try again.";
}
