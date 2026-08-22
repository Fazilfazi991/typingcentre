import "server-only";
import ExcelJS from "exceljs";

export const IMPORT_MAX_BYTES = 15 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5_000;
export const IMPORT_MAX_COLUMNS = 80;

export type ImportSheet = { name: string; headers: string[]; rows: Record<string, string>[] };
export type ImportParseResult = { format: "csv" | "xlsx"; sheets: ImportSheet[] };

const aliases: Record<string, string[]> = {
  customer_name: ["customer", "customer name", "client", "client name", "name"],
  customer_phone: ["phone", "mobile", "mobile no", "mobile number", "contact", "contact number"],
  customer_email: ["email", "customer email", "client email"],
  company_name: ["company", "company name", "sponsor company"],
  company_phone: ["company phone", "company mobile"],
  branch: ["branch", "branch name", "location"],
  document_type: ["document", "document type", "doc type"],
  document_number: ["document no", "document number", "doc no", "passport no", "visa no", "emirates id no", "eid no", "trade licence no"],
  issue_date: ["issue date", "issued on", "issue"],
  expiry_date: ["expiry", "expiry date", "expiration", "expiration date", "exp", "exp date", "valid until", "passport expiry", "visa expiry", "emirates id expiry", "trade license expiry", "trade licence expiry", "license expiry", "licence expiry"],
  notes: ["notes", "remarks", "comment"],
};

function text(value: unknown) { return String(value ?? "").trim(); }
export function normalizeHeader(value: string) { return value.toLowerCase().replace(/[_\-./]+/g, " ").replace(/\s+/g, " ").trim(); }
export function suggestField(header: string) {
  const normalized = normalizeHeader(header);
  const candidates = Object.entries(aliases).filter(([, values]) => values.some((value) => normalized === value || normalized.includes(value)));
  const exact = candidates.find(([, values]) => values.includes(normalized));
  if (exact) return exact[0];
  const phone = candidates.find(([field]) => field === "customer_phone" || field === "company_phone");
  return phone?.[0] ?? candidates[0]?.[0] ?? null;
}

function uniqueHeaders(values: unknown[]) {
  const used = new Map<string, number>();
  return values.map((value, index) => {
    const base = text(value) || `Column ${index + 1}`;
    const amount = used.get(base) ?? 0;
    used.set(base, amount + 1);
    return amount ? `${base} (${amount + 1})` : base;
  });
}

function rowsFromMatrix(matrix: unknown[][], name: string): ImportSheet {
  const first = matrix.findIndex((row) => row.some((value) => text(value)));
  if (first < 0) return { name, headers: [], rows: [] };
  const headers = uniqueHeaders(matrix[first].slice(0, IMPORT_MAX_COLUMNS));
  const rows = matrix.slice(first + 1, first + 1 + IMPORT_MAX_ROWS).filter((row) => row.some((value) => text(value))).map((row) => Object.fromEntries(headers.map((header, index) => [header, text(row[index])])));
  return { name, headers, rows };
}

function parseCsv(textValue: string) {
  const matrix: string[][] = []; let row: string[] = [], current = "", quoted = false;
  const input = textValue.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { current += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(current); current = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(current); matrix.push(row); row = []; current = "";
    } else current += char;
  }
  if (current || row.length) { row.push(current); matrix.push(row); }
  return rowsFromMatrix(matrix, "CSV");
}

export async function parseImportFile(file: File): Promise<ImportParseResult> {
  const name = file.name.toLowerCase();
  if (file.size > IMPORT_MAX_BYTES) throw new Error("The file is larger than the 15 MB import limit.");
  if (name.endsWith(".csv")) return { format: "csv", sheets: [parseCsv(await file.text())] };
  if (!name.endsWith(".xlsx")) throw new Error("Upload a CSV or XLSX file.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheets = workbook.worksheets.map((sheet) => rowsFromMatrix(sheet.getSheetValues().slice(1).map((row: any) => Array.isArray(row) ? row.slice(1).map((value) => typeof value === "object" && value ? ("text" in value ? value.text : "result" in value ? value.result : "") : value) : []), sheet.name)).filter((sheet) => sheet.headers.length);
  if (!sheets.length) throw new Error("No readable rows were found in this workbook.");
  return { format: "xlsx", sheets };
}

export function normalizePhone(value: string) {
  const raw = value.replace(/[\s()\-]/g, "");
  if (/^0?5\d{8}$/.test(raw)) return `+971${raw.replace(/^0/, "")}`;
  if (/^9715\d{8}$/.test(raw)) return `+${raw}`;
  if (/^\+9715\d{8}$/.test(raw)) return raw;
  return /^\+\d{8,15}$/.test(raw) ? raw : null;
}

export function parseImportDate(value: string) {
  const input = value.trim();
  if (!input) return { value: null, ambiguous: false };
  if (/^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(`${input}T00:00:00Z`))) return { value: input, ambiguous: false };
  const match = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const first = Number(match[1]), second = Number(match[2]), year = Number(match[3]);
    if (first > 12 && second <= 12) return { value: `${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`, ambiguous: false };
    if (second > 12 && first <= 12) return { value: `${year}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`, ambiguous: false };
    return { value: null, ambiguous: true };
  }
  const serial = Number(input);
  if (Number.isInteger(serial) && serial > 20_000 && serial < 80_000) return { value: new Date(Date.UTC(1899, 11, 30 + serial)).toISOString().slice(0, 10), ambiguous: false };
  return { value: null, ambiguous: false };
}
