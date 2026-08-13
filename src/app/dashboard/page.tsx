import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { completeFollowUpAction } from "@/features/crm/actions";
import { applyExpiryBucket, expiryBoundaries, formatDisplayDate, getRelativeExpiryText } from "@/lib/dates/expiry";
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

export default async function Dashboard() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);

  const now = new Date();
  const { today, tomorrow, day8, day31 } = expiryBoundaries(now, context.organization.timezone);
  const documentCount = (bucket: "expired" | "next-7-days" | "days-8-to-30") =>
    applyExpiryBucket(context.supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id).is("archived_at", null), bucket, now, context.organization.timezone);
  const documentPreview = (bucket: "expired" | "next-7-days" | "days-8-to-30") =>
    applyExpiryBucket(context.supabase.from("documents").select("expires_on").eq("organization_id", context.organization.id).is("archived_at", null), bucket, now, context.organization.timezone).order("expires_on").limit(1);

  const [expiredResult, weekResult, monthResult, followUpResult, validResult, renewalResult, attentionResult, todaysFollowUpsResult, activityResult, expiredPreview, weekPreview, monthPreview, followUpPreview] = await Promise.all([
    documentCount("expired"),
    documentCount("next-7-days"),
    documentCount("days-8-to-30"),
    context.supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id).gte("due_at", `${today}T00:00:00+04:00`).lt("due_at", `${tomorrow}T00:00:00+04:00`).neq("status", "completed"),
    context.supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id).is("archived_at", null).gte("expires_on", day31).neq("status", "renewal_in_progress"),
    context.supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id).is("archived_at", null).eq("status", "renewal_in_progress"),
    context.supabase.from("documents").select("id,document_number,expires_on,status,customer_id,company_id,customers(full_name),companies(name),organization_document_types(name)").eq("organization_id", context.organization.id).is("archived_at", null).lt("expires_on", day8).order("expires_on").limit(8),
    context.supabase.from("follow_ups").select("id,due_at,status,note,customer_id,company_id,customers(full_name),companies(name)").eq("organization_id", context.organization.id).gte("due_at", `${today}T00:00:00+04:00`).lt("due_at", `${tomorrow}T00:00:00+04:00`).neq("status", "completed").order("due_at").limit(5),
    context.supabase.from("activity_logs").select("id,entity_type,message,created_at").eq("organization_id", context.organization.id).order("created_at", { ascending: false }).limit(5),
    documentPreview("expired"), documentPreview("next-7-days"), documentPreview("days-8-to-30"),
    context.supabase.from("follow_ups").select("due_at").eq("organization_id", context.organization.id).gte("due_at", `${today}T00:00:00+04:00`).lt("due_at", `${tomorrow}T00:00:00+04:00`).neq("status", "completed").order("due_at").limit(1),
  ]);

  const expired = expiredResult.count ?? 0;
  const week = weekResult.count ?? 0;
  const month = monthResult.count ?? 0;
  const followUps = followUpResult.count ?? 0;
  const attention = attentionResult.data ?? [];
  const todaysFollowUps = todaysFollowUpsResult.data ?? [];
  const cards = [
    ["Expired", expired, "alert", "danger", expiredPreview.data?.[0] ? `Oldest: ${getRelativeExpiryText(expiredPreview.data[0].expires_on, now)}` : "No expired documents", "/documents?expiry=expired", `View ${expired} expired documents`],
    ["Expiring in 7 days", week, "clock", "warning", weekPreview.data?.[0] ? `Next: ${getRelativeExpiryText(weekPreview.data[0].expires_on, now)}` : "Nothing due this week", "/documents?expiry=7-days", `View ${week} documents expiring within 7 days`],
    ["Expiring in 30 days", month, "calendar", "info", monthPreview.data?.[0] ? `Nearest: ${getRelativeExpiryText(monthPreview.data[0].expires_on, now)}` : "Nothing due in 30 days", "/documents?expiry=30-days", `View ${month} documents expiring from day 8 through day 30`],
    ["Follow-ups today", followUps, "checklist", "purple", followUpPreview.data?.[0] ? `Next: ${new Intl.DateTimeFormat("en-AE", { hour: "numeric", minute: "2-digit" }).format(new Date(followUpPreview.data[0].due_at))}` : "No follow-ups scheduled", "/follow-ups?date=today", `View ${followUps} follow-ups scheduled today`],
  ] as const;
  const health = [["Valid", validResult.count ?? 0, "success"], ["Expiring soon", week + month, "warning"], ["Expired", expired, "danger"], ["Renewal in progress", renewalResult.count ?? 0, "purple"]] as const;
  const healthTotal = health.reduce((total, [, value]) => total + value, 0);

  return <WorkspaceShell organizationName={context.organization.name} activePath="/dashboard">
    <header className="page-heading dashboard-hero"><span className="overview-icon" aria-hidden>DOC</span><div className="overview-copy"><h1>Document Overview</h1><p>Monitor upcoming expiries and renewal actions.</p></div></header>
    <section className="metric-grid" aria-label="Document overview metrics">{cards.map(([label, value, icon, color, description, href, ariaLabel]) => <Link href={href} aria-label={ariaLabel} className={`metric-card metric-${color}`} key={label}><span className="metric-icon" aria-hidden><MetricGlyph name={icon}/></span><span className="metric-copy"><small>{label}</small><strong>{value}</strong><em>{description}</em></span></Link>)}</section>
    <section className="dashboard-primary"><article className="panel attention-panel"><div className="panel-heading"><div className="section-title"><span className="section-icon" aria-hidden>DOC</span><div><h2>Needs Attention</h2><p>Expired and next-seven-day documents.</p></div></div><Link className="ghost-action" href="/documents?expiry=expired">View all</Link></div>{attention.length ? <div className="attention-table-wrap"><table className="attention-table"><thead><tr><th>Customer / company</th><th>Document</th><th>Expiry</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{attention.map((document: any) => { const customer = relation(document.customers); const company = relation(document.companies); const type = relation(document.organization_document_types); const owner = customer?.full_name || company?.name || "Document record"; const [status, tone] = statusFor(document.expires_on, document.status); return <tr key={document.id}><td><span className="person"><span className="initial-avatar">{initials(owner)}</span><span><b>{owner}</b><small>{customer && company?.name ? company.name : "Document record"}</small></span></span></td><td><b>{type?.name || document.document_number || "Document"}</b><small>{document.document_number || "No number"}</small></td><td><time className={`expiry-${tone}`}>{formatDisplayDate(document.expires_on)}</time></td><td>{getRelativeExpiryText(document.expires_on, now)}</td><td><span className={`status-pill ${tone}`}>{status}</span></td></tr>; })}</tbody></table></div> : <div className="dashboard-empty"><span aria-hidden>OK</span><b>Nothing needs attention</b><p>Your upcoming document expiries will appear here.</p></div>}</article>
    <article className="panel followups-panel"><div className="panel-heading"><div className="section-title"><span className="section-icon" aria-hidden>FU</span><div><h2>Today&apos;s Follow-Ups</h2><p>Customers to contact today.</p></div></div><Link className="add-action" href="/follow-ups">Add</Link></div>{todaysFollowUps.length ? <div className="followup-list">{todaysFollowUps.map((item: any) => { const customer = relation(item.customers); const company = relation(item.companies); const person = customer?.full_name || company?.name || "Follow-up"; return <article className="followup-item" key={item.id}><span className="initial-avatar">{initials(person)}</span><span className="followup-copy"><b>{person}</b><small>{item.note || company?.name || "Follow-up"}</small></span><time>{new Intl.DateTimeFormat("en-AE", { hour: "numeric", minute: "2-digit" }).format(new Date(item.due_at))}</time><form action={completeFollowUpAction}><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="customerResponse" value=""/><input type="hidden" name="nextDueAt" value=""/><input type="hidden" name="nextNote" value=""/><button aria-label={`Mark follow-up with ${person} complete`} className="complete-check" type="submit">Complete</button></form></article>; })}</div> : <div className="dashboard-empty compact"><span aria-hidden>OK</span><b>No follow-ups for today</b><p>Scheduled customer contacts will appear here.</p></div>}<Link className="panel-footer-link" href="/follow-ups?date=today">View all {followUps} follow-ups</Link></article></section>
    <section className="dashboard-secondary"><article className="panel document-health-panel"><div className="panel-heading"><div><h2>Document Health</h2><p>Your document portfolio at a glance.</p></div><span className="health-total">{healthTotal} tracked</span></div><div className="health-bar" aria-label="Document health distribution">{health.map(([label, value, tone]) => <span className={`health-segment ${tone}`} key={label} style={{ flexGrow: Math.max(value, 0.15) }} title={`${label}: ${value}`}/>)}</div><div className="health-stat-grid">{health.map(([label, value, tone]) => <div className="health-stat" key={label}><span className={`health-dot ${tone}`} aria-hidden/><span>{label}</span><b>{value}</b><small>{healthTotal ? Math.round((value / healthTotal) * 100) : 0}%</small></div>)}</div></article><article className="panel activity-panel"><div className="panel-heading"><div><h2>Recent Activity</h2><p>Latest changes in this workspace.</p></div></div>{activityResult.data?.length ? <div className="activity-list">{activityResult.data.map((entry: any) => <article className="activity-item" key={entry.id}><p>{entry.message}</p><time>{new Intl.DateTimeFormat("en-AE", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(entry.created_at))}</time></article>)}</div> : <div className="dashboard-empty compact"><span aria-hidden>RT</span><b>No recent activity</b><p>Workspace updates will appear here.</p></div>}</article></section>
  </WorkspaceShell>;
}
