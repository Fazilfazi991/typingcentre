import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CalendarView, type CalendarEvent } from "./calendar-view";
import { localDateTimeParts } from "@/lib/dates/expiry";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const relation = <T,>(value: T | T[] | null | undefined) => Array.isArray(value) ? value[0] : value;
const validMonth = (value: string | undefined) => Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
const addMonth = (month: string) => {
  const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 7);
};
const localDate = (value: string, timezone: string) => localDateTimeParts(new Date(value), timezone).date;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWorkspaceContext("/calendar");
  if (!context) redirect("/account-inactive" as never);
  const rawMonth = (await searchParams).month;
  const today = localDateTimeParts(new Date(), context.organization.timezone).date;
  const month = validMonth(typeof rawMonth === "string" ? rawMonth : undefined) ? rawMonth as string : today.slice(0, 7);
  const nextMonth = addMonth(month);
  const lowerFollowUpBound = new Date(`${month}-01T00:00:00Z`); lowerFollowUpBound.setUTCDate(lowerFollowUpBound.getUTCDate() - 1);
  const upperFollowUpBound = new Date(`${nextMonth}-01T00:00:00Z`); upperFollowUpBound.setUTCDate(upperFollowUpBound.getUTCDate() + 1);
  const [documentsResult, followUpsResult] = await Promise.all([
    context.supabase.from("documents").select("id,expires_on,status,customer_id,company_id,customers(full_name),companies(name),organization_document_types(name)").eq("organization_id", context.organization.id).is("archived_at", null).gte("expires_on", `${month}-01`).lt("expires_on", `${nextMonth}-01`).order("expires_on").limit(500),
    context.supabase.from("follow_ups").select("id,due_at,status,customer_id,company_id,customers(full_name),companies(name)").eq("organization_id", context.organization.id).gte("due_at", lowerFollowUpBound.toISOString()).lt("due_at", upperFollowUpBound.toISOString()).order("due_at").limit(500),
  ]);
  const documents = documentsResult.data ?? [];
  const followUps = (followUpsResult.data ?? []).filter((item: any) => localDate(item.due_at, context.organization.timezone).startsWith(month));
  const events: CalendarEvent[] = [
    ...documents.map((item: any) => {
      const customer = relation<any>(item.customers); const company = relation<any>(item.companies); const type = relation<any>(item.organization_document_types);
      const status = item.expires_on < today ? "expired" : item.expires_on === today ? "today" : "upcoming";
      return { id: `document-${item.id}`, date: item.expires_on, title: `${customer?.full_name || company?.name || "Document record"} — ${type?.name || "Document"} expiry`, detail: item.status?.replace(/_/g, " ") || "Active", href: `/documents/${item.id}`, category: "document", status } as CalendarEvent;
    }),
    ...followUps.map((item: any) => {
      const customer = relation<any>(item.customers); const company = relation<any>(item.companies); const date = localDate(item.due_at, context.organization.timezone);
      return { id: `follow-up-${item.id}`, date, title: `${customer?.full_name || company?.name || "Follow-up"} — Follow-up`, detail: new Intl.DateTimeFormat("en-AE", { timeZone: context.organization.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(item.due_at)), href: `/follow-ups/${item.id}/edit`, category: "follow-up", status: item.status === "completed" ? "completed" : date < today ? "expired" : date === today ? "today" : "upcoming" } as CalendarEvent;
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  return <WorkspaceShell organizationName={context.organization.name} activePath="/calendar"><header className="page-heading"><p className="eyebrow">Planning</p><h1>Calendar</h1><p>Document expiries and customer or company follow-ups for this workspace.</p></header><CalendarView month={month} today={today} events={events}/></WorkspaceShell>;
}
