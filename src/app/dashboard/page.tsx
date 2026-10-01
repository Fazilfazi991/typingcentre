import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { calculateDaysRemaining, expiryBoundaries, renewalRangePath } from "@/lib/dates/expiry";
import { followUpTodayBounds } from "@/lib/follow-ups/filters";
import { isRelevantExpiryRecord, oneRelation, RENEWAL_RECORD_SELECT } from "@/lib/renewals/records";
import { renewalDetailPath, renewalRemainingText } from "@/lib/renewals/workflow";
import { money, statusLabels, type RequestStatus } from "@/lib/service-requests/workflow";
import { getWorkspaceContext } from "@/lib/workspace/context";
import "./dashboard.css";

export const dynamic = "force-dynamic";

type WorkItem = {
  id: string;
  href: string;
  title: string;
  description: string;
  detail: string;
  mark: string;
  priority: number;
  order: number;
};

export default async function Dashboard() {
  const context = await getWorkspaceContext("/dashboard");
  if (!context) redirect("/account-inactive" as never);

  const now = new Date();
  const { today, day31 } = expiryBoundaries(now, context.organization.timezone);
  const followUpBounds = followUpTodayBounds(now, context.organization.timezone);
  const [{ data: snapshot, error: snapshotError }, { data: requests, error: requestsError }, { data: renewalRecords, error: renewalsError }] = await Promise.all([
    context.supabase.rpc("dashboard_snapshot", {
      target_organization_id: context.organization.id,
      target_today: today,
      follow_up_start: followUpBounds.start,
      follow_up_end: followUpBounds.end,
      activity_limit: 1,
    }),
    context.supabase.from("service_requests")
      .select("id,request_number,status,created_at,completed_at,expected_completion_at,total_amount,paid_amount,customers(full_name),service_catalog(name)")
      .eq("organization_id", context.organization.id).is("archived_at", null)
      .order("created_at", { ascending: false }).limit(500),
    context.supabase.from("documents").select(RENEWAL_RECORD_SELECT)
      .eq("organization_id", context.organization.id).is("archived_at", null)
      .gte("expires_on", today).lt("expires_on", day31)
      .order("expires_on").limit(100),
  ]);
  if (snapshotError) throw snapshotError;
  if (requestsError) throw requestsError;
  if (renewalsError) throw renewalsError;

  const serviceRows = requests ?? [];
  const waitingIds = serviceRows.filter((item) => item.status === "waiting_documents").map((item) => item.id);
  const { data: missingRequirements, error: requirementsError } = waitingIds.length
    ? await context.supabase.from("service_request_requirements")
      .select("service_request_id,name").eq("organization_id", context.organization.id)
      .eq("required", true).eq("status", "missing").in("service_request_id", waitingIds).limit(500)
    : { data: [], error: null };
  if (requirementsError) throw requirementsError;
  const missingByRequest = new Map<string, string>();
  for (const requirement of missingRequirements ?? []) {
    if (!missingByRequest.has(requirement.service_request_id)) missingByRequest.set(requirement.service_request_id, requirement.name);
  }

  const payload = (snapshot ?? {}) as {
    metrics?: { days0To30?: number };
    followUps?: { count?: number; items?: Array<{ id: string; due_at: string; note: string | null; customers: { full_name: string } | null; companies: { name: string } | null }> };
  };
  const followUps = payload.followUps?.items ?? [];
  const localDay = (value: string) => new Intl.DateTimeFormat("en-CA", {
    timeZone: context.organization.timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
  const active = serviceRows.filter((item) => !["completed", "cancelled", "rejected"].includes(item.status));
  const waiting = active.filter((item) => item.status === "waiting_documents");
  const collection = active.filter((item) => item.status === "ready_for_collection");
  const outstanding = serviceRows.filter((item) => !["cancelled", "rejected"].includes(item.status))
    .reduce((sum, item) => sum + Math.max(0, Number(item.total_amount) - Number(item.paid_amount)), 0);
  const completedToday = serviceRows.filter((item) => item.status === "completed" && item.completed_at && localDay(item.completed_at) === today).length;
  const renewals = (renewalRecords ?? []).filter((record) => isRelevantExpiryRecord(record)).slice(0, 5);

  const work: WorkItem[] = [];
  for (const item of active) {
    let priority = 5;
    let title = statusLabels[item.status as RequestStatus] || "Service request";
    let mark = "·";
    if (item.status === "action_required") { priority = 0; title = "Action Required"; mark = "!"; }
    else if (item.status === "waiting_documents") { priority = 1; title = missingByRequest.has(item.id) ? `Missing ${missingByRequest.get(item.id)}` : "Missing Documents"; mark = "!"; }
    else if (item.expected_completion_at && new Date(item.expected_completion_at) < now && item.status !== "ready_for_collection") { priority = 2; title = "Overdue service request"; mark = "!"; }
    else if (item.status === "ready_for_collection") { priority = 3; title = "Ready for Collection"; mark = "✓"; }
    const customer = oneRelation(item.customers)?.full_name ?? "Customer";
    const service = oneRelation(item.service_catalog)?.name ?? "Service request";
    work.push({ id: item.id, href: `/service-requests/${item.id}`, title, description: `${customer} · ${service}`, detail: item.request_number, mark, priority, order: Date.parse(item.created_at) });
  }
  for (const item of followUps) {
    const person = item.customers?.full_name ?? item.companies?.name ?? "Customer";
    work.push({ id: item.id, href: `/follow-ups/${item.id}/edit`, title: "Follow-up Due", description: `${person} · ${item.note || "Customer follow-up"}`, detail: new Intl.DateTimeFormat("en-AE", { timeZone: context.organization.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(item.due_at)), mark: "↗", priority: 4, order: Date.parse(item.due_at) });
  }
  work.sort((a, b) => a.priority - b.priority || a.order - b.order);
  const categoryLimits = [2, 2, 1, 1, 1, 1];
  const categoryCounts = [0, 0, 0, 0, 0, 0];
  const visibleWork = work.filter((item) => {
    if (categoryCounts[item.priority] >= categoryLimits[item.priority]) return false;
    categoryCounts[item.priority] += 1;
    return true;
  }).slice(0, 8);
  if (visibleWork.length < 8) {
    const selected = new Set(visibleWork.map((item) => item.id));
    visibleWork.push(...work.filter((item) => !selected.has(item.id)).slice(0, 8 - visibleWork.length));
    visibleWork.sort((a, b) => a.priority - b.priority || a.order - b.order);
  }
  const kpis = [
    { label: "Open Requests", value: active.length, href: "/service-requests" },
    { label: "Waiting for Documents", value: waiting.length, href: "/service-requests?status=waiting_documents" },
    { label: "Ready for Collection", value: collection.length, href: "/service-requests?status=ready_for_collection" },
    { label: "Expiring in 30 Days", value: Number(payload.metrics?.days0To30 ?? 0), href: renewalRangePath("30d") },
  ];

  return <WorkspaceShell organizationName={context.organization.name} activePath="/dashboard">
    <main className="operations-dashboard">
      <header className="operations-header">
        <div><h1>Typing Centre Overview</h1><p>Today&apos;s work and upcoming customer actions.</p></div>
        <Link className="primary-button" href="/service-requests/new">+ New Service Request</Link>
      </header>

      <section className="operations-kpis" aria-label="Key operational metrics">
        {kpis.map((item) => <Link className="operations-kpi" href={item.href} key={item.label}>
          <span>{item.label}</span><strong>{item.value}</strong><small>View <span aria-hidden>→</span></small>
        </Link>)}
      </section>

      <div className="operations-grid">
        <section className="operations-panel operations-work" aria-labelledby="todays-work-title">
          <header className="operations-panel-heading"><h2 id="todays-work-title">Today&apos;s Work</h2><Link href="/service-requests">View all <span aria-hidden>→</span></Link></header>
          {visibleWork.length ? <ul className="operations-list">{visibleWork.map((item) => <li key={`${item.priority}-${item.id}`}>
            <Link className="operations-work-row" href={item.href}>
              <span className={`operations-mark operations-mark-${item.priority}`} aria-hidden>{item.mark}</span>
              <span className="operations-row-copy"><strong>{item.title}</strong><span>{item.description}</span><small className="operations-mobile-detail">{item.detail}</small></span>
              <small>{item.detail}</small><span className="operations-arrow" aria-hidden>→</span>
            </Link>
          </li>)}</ul> : <p className="operations-empty">No work needs attention today.</p>}
        </section>

        <section className="operations-panel operations-renewals" aria-labelledby="upcoming-renewals-title">
          <header className="operations-panel-heading"><h2 id="upcoming-renewals-title">Upcoming Renewals</h2></header>
          {renewals.length ? <ul className="operations-list">{renewals.map((record) => {
            const customer = oneRelation(record.customers);
            const company = oneRelation(record.companies);
            const type = oneRelation(record.organization_document_types);
            const days = calculateDaysRemaining(record.expires_on ?? undefined, now, context.organization.timezone);
            return <li key={record.id}><Link className="operations-renewal-row" href={renewalDetailPath(record.id, "30d")}>
              <span><strong>{type?.name || record.display_name || "Document"}</strong><small>{customer?.full_name || company?.name || "Document record"}</small></span>
              <em>{renewalRemainingText(days)}</em><span className="operations-arrow" aria-hidden>→</span>
            </Link></li>;
          })}</ul> : <p className="operations-empty">No renewals in the next 30 days.</p>}
          <Link className="operations-panel-footer" href={renewalRangePath("30d")}>View all renewals <span aria-hidden>→</span></Link>
        </section>
      </div>

      <section className="operations-snapshot" aria-label="Operation snapshot">
        <div><span>Processing</span><strong>{active.filter((item) => item.status === "processing").length}</strong></div>
        <div><span>Follow-ups Today</span><strong>{Number(payload.followUps?.count ?? 0)}</strong></div>
        <div><span>Outstanding</span><strong>{money(outstanding)}</strong></div>
        <div><span>Completed Today</span><strong>{completedToday}</strong></div>
      </section>
    </main>
  </WorkspaceShell>;
}
