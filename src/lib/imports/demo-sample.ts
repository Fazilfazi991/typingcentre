import "server-only";
import { createHash } from "node:crypto";
import { normalizePhone, parseImportDate } from "./parser";

export const DEMO_IMPORT_FILE = "note-it-demo-import.csv";
export const DEMO_IMPORT_HEADERS = [
  "customer_name",
  "customer_phone",
  "customer_email",
  "company_name",
  "company_phone",
  "branch",
  "document_type",
  "document_number",
  "issue_date",
  "expiry_date",
  "notes",
];
export const DEMO_IMPORT_MAPPING = Object.fromEntries(
  DEMO_IMPORT_HEADERS.map((field) => [field, field]),
);
const fictional = "Fictional sample for Note It demonstrations. Not a real person or document.";
const record = (
  name: string,
  phone: string,
  type: string,
  number: string,
  expiry: string,
  company = "",
  nationality = "",
) => ({
  customer_name: name,
  customer_phone: phone,
  customer_email: name ? `${name.toLowerCase().replaceAll(" ", ".")}@sample.example.invalid` : "",
  company_name: company,
  company_phone: "",
  branch: "",
  document_type: type,
  document_number: number,
  issue_date: "2026-01-15",
  expiry_date: expiry,
  notes: `${fictional}${nationality ? ` Sample nationality: ${nationality}.` : ""}`,
});
export const DEMO_IMPORT_ROWS = [
  record(
    "Amina Rahman",
    "+971500001201",
    "Passport",
    "DEMO-IMPORT-P-001",
    "2028-08-16",
    "",
    "Indian",
  ),
  record(
    "John Mathew",
    "+971500001202",
    "Emirates ID",
    "DEMO-IMPORT-EID-002",
    "2027-11-20",
    "Sunrise Technical Services LLC",
    "Indian",
  ),
  record(
    "",
    "",
    "Trade Licence",
    "DEMO-IMPORT-TL-003",
    "2027-12-15",
    "Sunrise Technical Services LLC",
  ),
  record(
    "Maria Santos",
    "+971500001203",
    "Residence Visa",
    "DEMO-IMPORT-V-004",
    "2028-03-25",
    "Sunrise Technical Services LLC",
    "Filipino",
  ),
  record("Lina Sample", "+971500001204", "Passport", "DEMO-IMPORT-P-005", "2028-06-10"),
  record("Sameer Sample", "+971500001205", "Emirates ID", "DEMO-IMPORT-EID-006", "2027-07-12"),
  record("Fatima Sample", "+971500001206", "Residence Visa", "DEMO-IMPORT-V-007", "2028-02-18"),
  record("Faisal Sample", "+971500001207", "Passport", "DEMO-IMPORT-P-008", "2028-09-30"),
  record("Ahmed Hassan", "+971500002201", "Emirates ID", "DEMO-SR-EID-001", "2027-07-28"),
  record("Tariq Sample", "+971500001208", "Passport", "DEMO-IMPORT-P-010", "04/05/2028"),
];
export function demoImportCsv() {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    DEMO_IMPORT_HEADERS.map(quote).join(","),
    ...DEMO_IMPORT_ROWS.map((row) =>
      DEMO_IMPORT_HEADERS.map((field) => quote(row[field as keyof typeof row])).join(","),
    ),
  ].join("\r\n");
}
export function demoImportId(organizationId: string, suffix = "job") {
  const hash = createHash("sha256")
    .update(`note-it-demo-import-v1:${organizationId}:${suffix}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export function normalizedDemoRow(index: number) {
  const row = DEMO_IMPORT_ROWS[index];
  return {
    customer_name: row.customer_name || null,
    customer_phone: normalizePhone(row.customer_phone),
    customer_email: row.customer_email || null,
    company_name: row.company_name || null,
    company_phone: null,
    branch: null,
    document_type: row.document_type,
    document_number: row.document_number,
    issue_date: parseImportDate(row.issue_date).value,
    expiry_date: parseImportDate(row.expiry_date).value,
    notes: row.notes,
  };
}
export type DemoStagedRow = {
  id: string;
  row_number: number;
  source_sheet_name: string;
  source_data: unknown;
  normalized_data: unknown;
  status: string;
  resolution: string | null;
};
function sameRecord(actual: unknown, expected: Record<string, unknown>) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  const record = actual as Record<string, unknown>;
  return (
    Object.keys(record).length === Object.keys(expected).length &&
    Object.entries(expected).every(([key, value]) => record[key] === value)
  );
}
/** Never authorize demo execution from a job name, browser payload, or editable staged values alone. */
export function assertDemoSampleRows(
  rows: DemoStagedRow[],
  organizationId: string,
  normalized = false,
) {
  if (rows.length !== DEMO_IMPORT_ROWS.length)
    throw new Error("The sample preview is incomplete. Reset Demo & Try Again.");
  const ordered = [...rows].sort((a, b) => a.row_number - b.row_number);
  ordered.forEach((row, index) => {
    if (
      row.id !== demoImportId(organizationId, `row-${index}`) ||
      row.row_number !== index + 2 ||
      row.source_sheet_name !== "CSV" ||
      !sameRecord(row.source_data, DEMO_IMPORT_ROWS[index])
    )
      throw new Error("Only the original fictional sample can be imported in Demo Mode.");
    if (!normalized) {
      if (row.normalized_data !== null && !sameRecord(row.normalized_data, {}))
        throw new Error("The sample preview must be validated before use.");
      return;
    }
    if (!sameRecord(row.normalized_data, normalizedDemoRow(index)))
      throw new Error("The fictional sample cannot be edited in Demo Mode.");
    const allowed =
      index === 9
        ? ["invalid", "skipped"]
        : index === 8
          ? ["possible_duplicate", "skipped"]
          : ["ready", "possible_duplicate", "skipped", "imported", "failed"];
    if (
      !allowed.includes(row.status) ||
      (row.status === "ready" && row.resolution !== "create") ||
      (row.status === "skipped" && row.resolution !== "skip") ||
      (row.status === "possible_duplicate" && row.resolution !== null)
    )
      throw new Error("Review and skip the sample duplicates before importing.");
  });
}
