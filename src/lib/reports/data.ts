import "server-only";
import { calculateDaysRemaining, expiryBoundaries } from "@/lib/dates/expiry";
import { reportRangeBounds, type ReportFilters, zonedMidnightUtc } from "@/lib/reports/filters";
import type { WorkspaceContext } from "@/lib/workspace/context";

const relation = <T>(item: T | T[] | null | undefined) => (Array.isArray(item) ? item[0] : item);

export type ReportDocument = {
  id: string;
  document_number: string | null;
  expires_on: string;
  status: string;
  customer_id: string | null;
  company_id: string | null;
  customers: { full_name: string } | { full_name: string }[] | null;
  companies: { name: string } | { name: string }[] | null;
  organization_document_types: { name: string } | { name: string }[] | null;
};

export function documentStatus(document: ReportDocument, now: Date, timezone: string) {
  const days = calculateDaysRemaining(document.expires_on, now, timezone);
  if (days === undefined) return "Unknown";
  if (days < 0) return "Expired";
  if (days === 0) return "Expiring today";
  if (days <= 7) return "Next 7 days";
  if (days <= 30) return "Next 30 days";
  return "Active";
}

export function ownerName(document: ReportDocument) {
  return (
    relation(document.customers)?.full_name ||
    relation(document.companies)?.name ||
    "Document record"
  );
}

export function documentTypeName(document: ReportDocument) {
  return relation(document.organization_document_types)?.name || "Other";
}

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function reportCsv(documents: ReportDocument[], now: Date, timezone: string) {
  const heading = [
    "Customer / Company",
    "Document type",
    "Document number",
    "Expiry date",
    "Remaining days",
    "Status",
  ];
  const rows = documents.map((document) => {
    const days = calculateDaysRemaining(document.expires_on, now, timezone);
    return [
      ownerName(document),
      documentTypeName(document),
      document.document_number || "",
      document.expires_on,
      days ?? "",
      documentStatus(document, now, timezone),
    ];
  });
  return [heading, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function getReportData(
  context: WorkspaceContext,
  filters: ReportFilters,
  now = new Date(),
) {
  const bounds = reportRangeBounds(filters, now, context.organization.timezone);
  let documentsQuery: any = context.supabase
    .from("documents")
    .select(
      "id,document_number,expires_on,status,customer_id,company_id,customers(full_name),companies(name),organization_document_types(name)",
    )
    .eq("organization_id", context.organization.id)
    .is("archived_at", null)
    .not("expires_on", "is", null);
  if (bounds)
    documentsQuery = documentsQuery.gte("expires_on", bounds.start).lt("expires_on", bounds.end);
  if (filters.owner === "customers") documentsQuery = documentsQuery.not("customer_id", "is", null);
  if (filters.owner === "companies") documentsQuery = documentsQuery.not("company_id", "is", null);
  if (filters.typeId) documentsQuery = documentsQuery.eq("document_type_id", filters.typeId);

  const queryDirection = filters.sort === "expiry-desc" ? false : true;
  const documentOrder =
    filters.sort === "name" ? "created_at" : filters.sort === "status" ? "status" : "expires_on";
  const followUpBounds = bounds
    ? {
        start: zonedMidnightUtc(bounds.start, context.organization.timezone),
        end: zonedMidnightUtc(bounds.end, context.organization.timezone),
      }
    : undefined;
  let followUpsQuery: any = context.supabase
    .from("follow_ups")
    .select("id,due_at,status")
    .eq("organization_id", context.organization.id);
  if (followUpBounds)
    followUpsQuery = followUpsQuery
      .gte("due_at", followUpBounds.start)
      .lt("due_at", followUpBounds.end);

  const [documentsResult, typesResult, customersResult, companiesResult, followUpsResult] =
    await Promise.all([
      documentsQuery
        .order(documentOrder, {
          ascending: filters.sort === "status" || filters.sort === "name" ? true : queryDirection,
        })
        .limit(500),
      context.supabase
        .from("organization_document_types")
        .select("id,name")
        .eq("organization_id", context.organization.id)
        .eq("is_active", true)
        .order("name"),
      context.supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id)
        .is("archived_at", null),
      context.supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id)
        .is("archived_at", null),
      followUpsQuery.limit(500),
    ]);
  if (documentsResult.error) throw documentsResult.error;
  if (typesResult.error) throw typesResult.error;
  if (followUpsResult.error) throw followUpsResult.error;

  const documents = (documentsResult.data ?? []) as ReportDocument[];
  const types = typesResult.data ?? [];
  const daysFor = (document: ReportDocument) =>
    calculateDaysRemaining(document.expires_on, now, context.organization.timezone);
  const expiry = { expired: 0, today: 0, next7: 0, next30: 0, active: 0 };
  const breakdown = new Map<string, number>();
  const ownersWithExpiry = { customers: new Set<string>(), companies: new Set<string>() };
  for (const document of documents) {
    const days = daysFor(document);
    if (days === undefined) continue;
    if (days < 0) expiry.expired += 1;
    else if (days === 0) expiry.today += 1;
    else if (days <= 7) expiry.next7 += 1;
    else if (days <= 30) expiry.next30 += 1;
    else expiry.active += 1;
    breakdown.set(documentTypeName(document), (breakdown.get(documentTypeName(document)) ?? 0) + 1);
    if (days >= 0 && days <= 30 && document.customer_id)
      ownersWithExpiry.customers.add(document.customer_id);
    if (days >= 0 && days <= 30 && document.company_id)
      ownersWithExpiry.companies.add(document.company_id);
  }

  const { today } = expiryBoundaries(now, context.organization.timezone);
  const todayStart = zonedMidnightUtc(today, context.organization.timezone);
  const followUps = { overdue: 0, today: 0, upcoming: 0, completed: 0 };
  for (const followUp of followUpsResult.data ?? []) {
    if (followUp.status === "completed") followUps.completed += 1;
    else if (followUp.status === "overdue" || followUp.due_at < todayStart) followUps.overdue += 1;
    else if (followUp.due_at.slice(0, 10) === today) followUps.today += 1;
    else followUps.upcoming += 1;
  }

  const sorted = [...documents].sort((left, right) => {
    if (filters.sort === "name") return ownerName(left).localeCompare(ownerName(right));
    if (filters.sort === "status")
      return documentStatus(left, now, context.organization.timezone).localeCompare(
        documentStatus(right, now, context.organization.timezone),
      );
    return filters.sort === "expiry-desc"
      ? right.expires_on.localeCompare(left.expires_on)
      : left.expires_on.localeCompare(right.expires_on);
  });
  return {
    documents: sorted,
    types,
    expiry,
    breakdown: [...breakdown.entries()].sort(([a], [b]) => a.localeCompare(b)),
    customers: { total: customersResult.count ?? 0, upcoming: ownersWithExpiry.customers.size },
    companies: { total: companiesResult.count ?? 0, upcoming: ownersWithExpiry.companies.size },
    followUps,
    truncated: documents.length === 500,
  };
}
