import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { completeFollowUpAction } from "@/features/crm/actions";
import { calculateDaysRemaining, formatDisplayDate, getRelativeExpiryText, renewalRangePath } from "@/lib/dates/expiry";
import { activityPresentation, calculatePortfolioInsights, formatActivityTime, HEALTH_PRESENTATION, percentage } from "@/lib/dashboard/insights";
import { applyFollowUpDateFilter, followUpDatePath } from "@/lib/follow-ups/filters";
import { isRelevantExpiryRecord, RENEWAL_RECORD_SELECT } from "@/lib/renewals/records";
import { renewalDetailPath } from "@/lib/renewals/workflow";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const relation = <T,>(item: T | T[] | null | undefined) => (Array.isArray(item) ? item[0] : item);
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function statusFor(date: string, storedStatus: string) {
  if (storedStatus === "renewal_in_progress") return ["Renewal in progress", "purple"] as const;
  const relative = getRelativeExpiryText(date);
  if (relative.startsWith("Expired")) return ["Expired", "danger"] as const;
  if (relative === "Expires today" || relative === "Expires tomorrow" || /^\d days remaining$/.test(relative)) return ["Expiring soon", "warning"] as const;
  return ["Upcoming", "info"] as const;
}

function MetricGlyph({ name }: { name: "alert" | "clock" | "calendar" | "checklist" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "alert") return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;
  if (name === "calendar") return <svg viewBox="0 0 24 24" {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 14h.01M15 14h.01M9 17h.01M15 17h.01"/></svg>;
  return <svg viewBox="0 0 24 24" {...common}><path d="m5 7 2 2 3-3M5 14l2 2 3-3M12 7h7M12 14h7"/></svg>;
}

function InsightGlyph({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "shield") return <svg viewBox="0 0 24 24" {...common}><path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;
  if (name === "alert") return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01"/></svg>;
  if (name === "refresh") return <svg viewBox="0 0 24 24" {...common}><path d="M19 8a7 7 0 0 0-12-2L5 8M5 4v4h4M5 16a7 7 0 0 0 12 2l2-2M19 20v-4h-4"/></svg>;
  if (name === "calendar") return <svg viewBox="0 0 24 24" {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 14h.01M15 14h.01"/></svg>;
  if (name === "user") return <svg viewBox="0 0 24 24" {...common}><circle cx="10" cy="8" r="3"/><path d="M4 20v-2a5 5 0 0 1 10 0v2M18 8v6M15 11h6"/></svg>;
  if (name === "document") return <svg viewBox="0 0 24 24" {...common}><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 14h4"/><path d="m14 17 4-4 2 2-4 4-3 1z"/></svg>;
  if (name === "check") return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if (name === "message") return <svg viewBox="0 0 24 24" {...common}><path d="M20 11a8 8 0 0 1-9 8 9 9 0 0 1-4-.9L3 20l1.4-4A8 8 0 1 1 20 11Z"/></svg>;
  return <svg viewBox="0 0 24 24" {...common}><path d="M6 3h9l3 3v15H6zM9 11h6M9 15h6"/></svg>;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const showAllActivity = (await searchParams).activity === "all";
  const destination = showAllActivity ? "/dashboard?activity=all#recent-activity" : "/dashboard";
  const context = await getWorkspaceContext(destination);
  if (!context) redirect("/account-inactive" as never);

  const now = new Date();
  const todayFollowUps = <T extends { gte: Function; lt: Function; neq: Function }>(query: T) =>
    applyFollowUpDateFilter(query, "today", now, context.organization.timezone);

  const [portfolioResult, followUpResult, todaysFollowUpsResult, activityResult] = await Promise.all([
    context.supabase.from("documents").select(RENEWAL_RECORD_SELECT).eq("organization_id", context.organization.id).is("archived_at", null).order("expires_on").limit(500),
    todayFollowUps(context.supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id)),
    todayFollowUps(context.supabase.from("follow_ups").select("id,due_at,status,note,customer_id,company_id,customers(full_name),companies(name)").eq("organization_id", context.organization.id)).order("due_at").limit(5),
    context.supabase.from("activity_logs").select("id,entity_type,message,created_at").eq("organization_id", context.organization.id).order("created_at", { ascending: false }).limit(showAllActivity ? 20 : 5),
  ]);

  if (portfolioResult.error) throw portfolioResult.error;
  if (followUpResult.error) throw followUpResult.error;
  if (todaysFollowUpsResult.error) throw todaysFollowUpsResult.error;

  const portfolio = (portfolioResult.data ?? []).filter(isRelevantExpiryRecord);
  const daysFor = (record: any) => calculateDaysRemaining(record.expires_on, now, context.organization.timezone);
  const upcoming = portfolio.filter((record: any) => { const days = daysFor(record); return days !== undefined && days >= 0 && days <= 30; });
  const todayCount = upcoming.filter((record: any) => daysFor(record) === 0).length;
  const week = upcoming.filter((record) => (calculateDaysRemaining(record.expires_on, now, context.organization.timezone) ?? 31) <= 7).length;
  const month = upcoming.length - week;
  const followUps = followUpResult.count ?? 0;
  const attention = portfolio.filter((record: any) => (daysFor(record) ?? 31) < 8).slice(0, 8);
  const todaysFollowUps = todaysFollowUpsResult.data ?? [];
  const cards = [
    ["Expiring today", todayCount, "alert", "danger", "Requires action today", "View today", renewalRangePath("today"), `View ${todayCount} documents expiring today`],
    ["Expiring in 7 days", week, "clock", "warning", "Contact customers soon", "View next 7 days", renewalRangePath("7d"), `View ${week} documents expiring within 7 days`],
    ["Expiring in 30 days", week + month, "calendar", "info", "Upcoming renewals", "View next 30 days", renewalRangePath("30d"), `View ${week + month} documents expiring within 30 days`],
    ["Follow-ups today", followUps, "checklist", "purple", "Scheduled today", "View follow-ups", followUpDatePath("today"), `View ${followUps} follow-ups scheduled today`],
  ] as const;
  const insights = calculatePortfolioInsights(portfolio, now, context.organization.timezone);
  const health = HEALTH_PRESENTATION.map((item) => ({ ...item, value: insights.health[item.key], percent: percentage(insights.health[item.key], insights.total) }));
  const expirationBuckets = [
    { label: "0–30 days", value: insights.upcoming.days0To30 },
    { label: "31–60 days", value: insights.upcoming.days31To60 },
    { label: "61–90 days", value: insights.upcoming.days61To90 },
  ];
  const chartMax = Math.max(...expirationBuckets.map((bucket) => bucket.value), 1);

  return <WorkspaceShell organizationName={context.organization.name} activePath="/dashboard">
    <header className="page-heading dashboard-hero overview-kpi-heading"><div className="overview-copy"><h1>Document Overview</h1><p>Monitor upcoming expiries and renewal actions.</p></div></header>
    <section className="metric-grid overview-kpi-grid" aria-label="Document overview metrics">{cards.map(([label, value, icon, color, description, actionLabel, href, ariaLabel]) => <Link href={href} aria-label={ariaLabel} className={`metric-card overview-kpi-card metric-${color}`} key={label}><span className="overview-kpi-main"><span className="metric-icon" aria-hidden><MetricGlyph name={icon}/></span><span className="metric-copy"><small>{label}</small><strong>{value}</strong><em>{description}</em></span></span><span className="overview-kpi-footer"><span>{actionLabel}</span><span className="metric-arrow" aria-hidden>→</span></span></Link>)}</section>
    <section className="dashboard-primary"><article className="panel attention-panel"><div className="panel-heading"><div className="section-title"><span className="section-icon" aria-hidden>DOC</span><div><h2>Needs Attention</h2><p>Expired and next-seven-day documents.</p></div></div><Link className="ghost-action" href={renewalRangePath("expired")}>View expired</Link></div>{attention.length ? <div className="attention-table-wrap"><table className="attention-table"><thead><tr><th>Customer / company</th><th>Document</th><th>Expiry</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{attention.map((document: any) => { const customer = relation(document.customers); const company = relation(document.companies); const type = relation(document.organization_document_types); const owner = customer?.full_name || company?.name || "Document record"; const [status, tone] = statusFor(document.expires_on, document.status); const detailRange = (daysFor(document) ?? 0) < 0 ? "expired" : "7d"; const href = renewalDetailPath(document.id, detailRange); return <tr className="attention-clickable-row" key={document.id}><td><Link href={href}><span className="person"><span className="initial-avatar">{initials(owner)}</span><span><b>{owner}</b><small>{customer && company?.name ? company.name : "Document record"}</small></span></span></Link></td><td><Link href={href}><b>{type?.name || document.document_number || "Document"}</b><small>{document.document_number || "No number"}</small></Link></td><td><Link href={href}><time className={`expiry-${tone}`}>{formatDisplayDate(document.expires_on)}</time></Link></td><td><Link href={href}>{getRelativeExpiryText(document.expires_on, now)}</Link></td><td><Link href={href}><span className={`status-pill ${tone}`}>{status}</span></Link></td></tr>; })}</tbody></table></div> : <div className="dashboard-empty"><span aria-hidden>OK</span><b>Nothing needs attention</b><p>Your upcoming document expiries will appear here.</p></div>}</article>
    <article className="panel followups-panel"><div className="panel-heading"><div className="section-title"><span className="section-icon" aria-hidden>FU</span><div><h2>Today&apos;s Follow-Ups</h2><p>Customers to contact today.</p></div></div><Link className="add-action" href="/follow-ups">Add</Link></div>{todaysFollowUps.length ? <div className="followup-list">{todaysFollowUps.map((item: any) => { const customer = relation(item.customers); const company = relation(item.companies); const person = customer?.full_name || company?.name || "Follow-up"; return <article className="followup-item" key={item.id}><span className="initial-avatar">{initials(person)}</span><span className="followup-copy"><b>{person}</b><small>{item.note || company?.name || "Follow-up"}</small></span><time>{new Intl.DateTimeFormat("en-AE", { hour: "numeric", minute: "2-digit" }).format(new Date(item.due_at))}</time><form action={completeFollowUpAction}><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="customerResponse" value=""/><input type="hidden" name="nextDueAt" value=""/><input type="hidden" name="nextNote" value=""/><button aria-label={`Mark follow-up with ${person} complete`} className="complete-check" type="submit">Complete</button></form></article>; })}</div> : <div className="dashboard-empty compact"><span aria-hidden>OK</span><b>No follow-ups for today</b><p>Scheduled customer contacts will appear here.</p></div>}<Link className="panel-footer-link" href="/follow-ups?date=today">View all {followUps} follow-ups</Link></article></section>
    <section className="dashboard-insights" aria-label="Document health and recent activity">
      <article className="insight-card document-health-card">
        <header className="insight-card-header"><div className="insight-heading"><span className="insight-heading-icon" aria-hidden><InsightGlyph name="document"/></span><div><h2>Document Health</h2><p>Your document portfolio at a glance</p></div></div><Link className="insight-action" href="/documents"><InsightGlyph name="document"/>View Documents</Link></header>
        <div className="health-metric-grid">{health.map((item) => <div className={`health-metric health-${item.tone}`} key={item.key}><span className="health-metric-icon" aria-hidden><InsightGlyph name={item.icon}/></span><span>{item.label}</span><b>{item.value}</b><small>documents</small></div>)}</div>
        <section className="portfolio-overview"><div className="subsection-heading"><h3>Portfolio Status Overview</h3><span>Total Documents: <b>{insights.total}</b></span></div><div className="portfolio-bar" aria-label="Portfolio status overview">{health.map((item) => <span className={`portfolio-segment ${item.tone}`} key={item.key} style={{ width: `${item.percent}%` }} title={`${item.label}: ${item.value} (${item.percent.toFixed(1)}%)`}/>)}</div><div className="portfolio-legend">{health.map((item) => <div key={item.key}><span className={`legend-dot ${item.tone}`} aria-hidden/><span>{item.label} ({item.value})</span><b>{item.percent.toFixed(1)}%</b></div>)}</div></section>
        <section className="expiration-chart"><div className="expiration-chart-header"><div className="insight-heading compact"><span className="insight-heading-icon" aria-hidden><InsightGlyph name="calendar"/></span><div><h3>Upcoming Expirations</h3><p>Next 90 days</p></div></div><Link className="insight-action compact" href={renewalRangePath("90d")}><InsightGlyph name="calendar"/>View Calendar</Link></div><div className="bar-chart" aria-label="Upcoming expirations by date range">{expirationBuckets.map((bucket) => <div className="bar-column" key={bucket.label}><span>{bucket.value}</span><div className="bar-track"><i style={{ height: `${Math.max((bucket.value / chartMax) * 100, bucket.value ? 8 : 0)}%` }}/></div><small>{bucket.label}</small></div>)}</div><div className="expiration-insight"><span className="insight-bulb" aria-hidden>!</span><p>{insights.upcomingTotal} document{insights.upcomingTotal === 1 ? " is" : "s are"} expiring in the next 90 days. Take action to stay compliant.</p><Link href={renewalRangePath("90d")}>View Expiring Documents <span aria-hidden>→</span></Link></div></section>
      </article>
      <article className="insight-card recent-activity-card" id="recent-activity">
        <header className="insight-card-header"><div><h2>Recent Activity</h2><p>Latest changes in this workspace</p></div><Link className="insight-action" href={showAllActivity ? "/dashboard#recent-activity" : "/dashboard?activity=all#recent-activity"}>{showAllActivity ? "Show Latest 5" : "View All Activity"}<span aria-hidden>→</span></Link></header>
        {activityResult.data?.length ? <div className="recent-activity-list">{activityResult.data.map((entry: any) => { const presentation = activityPresentation(entry.entity_type, entry.message); return <article className={`recent-activity-row activity-${presentation.tone}`} key={entry.id}><span className="recent-activity-icon" aria-hidden><InsightGlyph name={presentation.icon}/></span><p>{entry.message}</p><time><InsightGlyph name="clock"/>{formatActivityTime(entry.created_at, now, context.organization.timezone)}</time></article>; })}</div> : <div className="dashboard-empty compact"><span aria-hidden>RT</span><b>No recent activity</b><p>Workspace updates will appear here.</p></div>}
      </article>
    </section>
  </WorkspaceShell>;
}
