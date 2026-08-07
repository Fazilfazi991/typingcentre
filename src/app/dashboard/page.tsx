import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { completeFollowUpAction } from "@/features/crm/actions";
import { getRelativeExpiryText } from "@/lib/dates/expiry";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const relation = <T,>(item: T | T[] | null | undefined) => (Array.isArray(item) ? item[0] : item);

function statusFor(date: string, storedStatus: string) {
  if (storedStatus === "renewal_in_progress") return ["Renewal in progress", "purple"] as const;
  const relative = getRelativeExpiryText(date);
  if (relative.startsWith("Expired")) return ["Expired", "danger"] as const;
  const days = Math.ceil((new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
  if (days <= 7) return ["Expiring soon", "warning"] as const;
  return ["In 30 days", "amber"] as const;
}

function activityIcon(entityType: string) {
  if (entityType === "follow_up") return "FU";
  if (entityType === "company") return "CO";
  if (entityType === "customer") return "CU";
  if (entityType === "document") return "DO";
  return "RT";
}

export default async function Dashboard() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const inSeven = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const inThirty = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const count = (table: "documents" | "follow_ups", filter?: (query: any) => any) => {
    let query = context.supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id);
    if (filter) query = filter(query);
    return query;
  };

  const [
    { count: expired },
    { count: week },
    { count: month },
    { count: followUps },
    { count: valid },
    { count: healthExpired },
    { count: healthExpiring },
    { count: renewalInProgress },
    { data: attention },
    { data: todaysFollowUps },
    { data: activity },
  ] = await Promise.all([
    count("documents", (query) => query.lt("expires_on", date).is("archived_at", null)),
    count("documents", (query) =>
      query.gte("expires_on", date).lte("expires_on", inSeven).is("archived_at", null),
    ),
    count("documents", (query) =>
      query.gte("expires_on", date).lte("expires_on", inThirty).is("archived_at", null),
    ),
    count("follow_ups", (query) =>
      query.gte("due_at", todayStart).lt("due_at", tomorrow).neq("status", "completed"),
    ),
    count("documents", (query) =>
      query
        .is("archived_at", null)
        .or(`expires_on.is.null,expires_on.gt.${inThirty}`)
        .neq("status", "renewal_in_progress"),
    ),
    count("documents", (query) =>
      query.lt("expires_on", date).is("archived_at", null).neq("status", "renewal_in_progress"),
    ),
    count("documents", (query) =>
      query
        .gte("expires_on", date)
        .lte("expires_on", inThirty)
        .is("archived_at", null)
        .neq("status", "renewal_in_progress"),
    ),
    count("documents", (query) =>
      query.is("archived_at", null).eq("status", "renewal_in_progress"),
    ),
    context.supabase
      .from("documents")
      .select(
        "id, display_name, document_number, expires_on, status, customer_id, company_id, customers(full_name), companies(name)",
      )
      .eq("organization_id", context.organization.id)
      .is("archived_at", null)
      .lte("expires_on", inSeven)
      .order("expires_on")
      .limit(6),
    context.supabase
      .from("follow_ups")
      .select(
        "id, due_at, status, note, customer_id, company_id, customers(full_name), companies(name)",
      )
      .eq("organization_id", context.organization.id)
      .gte("due_at", todayStart)
      .lt("due_at", tomorrow)
      .neq("status", "completed")
      .order("due_at")
      .limit(5),
    context.supabase
      .from("activity_logs")
      .select("id, entity_type, message, created_at")
      .eq("organization_id", context.organization.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const cards = [
    ["Expired", expired ?? 0, "EX", "danger", "Requires action", "/customers"],
    ["Expiring in 7 days", week ?? 0, "7D", "warning", "Contact customers soon", "/customers"],
    ["Expiring in 30 days", month ?? 0, "30", "info", "Upcoming renewals", "/customers"],
    ["Follow-ups today", followUps ?? 0, "FU", "purple", "Scheduled today", "/follow-ups"],
  ] as const;
  const health = [
    ["Valid", valid ?? 0, "success"],
    ["Expiring soon", healthExpiring ?? 0, "warning"],
    ["Expired", healthExpired ?? 0, "danger"],
    ["Renewal in progress", renewalInProgress ?? 0, "purple"],
  ] as const;
  const healthTotal = health.reduce((total, [, value]) => total + value, 0);

  return (
    <WorkspaceShell organizationName={context.organization.name} activePath="/dashboard">
      <header className="page-heading dashboard-hero">
        <span className="overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H10l2 2h5.5A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M9 11h6M9 15h4"/></svg></span>
        <div className="overview-copy"><h1>Document Overview</h1><p>Monitor upcoming expiries and renewal actions.</p></div>
        <svg className="overview-waves" aria-hidden="true" viewBox="0 0 520 260" fill="none"><path d="M155 -16c32 77 125 93 211 143 56 33 102 72 144 136"/><path d="M188 -20c28 70 108 88 193 139 57 34 100 76 129 141"/><path d="M222 -24c25 63 93 86 177 136 55 33 96 77 112 144"/><path d="M259 -26c20 58 79 83 158 132 52 33 89 78 94 146"/><path d="M299 -27c15 52 64 81 137 129 49 32 79 79 73 148"/></svg>
      </header>

      <section className="metric-grid" aria-label="Document overview metrics">
        {cards.map(([label, value, icon, color, description, href]) => (
          <Link href={href} className={`metric-card metric-${color}`} key={label}>
            <span className="metric-icon" aria-hidden>
              {icon}
            </span>
            <span className="metric-copy">
              <small>{label}</small>
              <strong>{value}</strong>
              <em>{description}</em>
            </span>
            <span className="metric-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        ))}
      </section>

      <section className="dashboard-primary">
        <article className="panel attention-panel">
          <div className="panel-heading">
            <div className="section-title">
              <span className="section-icon" aria-hidden>
                DOC
              </span>
              <div>
                <h2>Needs Attention</h2>
                <p>Documents that require action soon.</p>
              </div>
            </div>
            <Link className="ghost-action" href="/customers">
              View all <span aria-hidden>&gt;</span>
            </Link>
          </div>
          {attention?.length ? (
            <>
              <div className="attention-table-wrap">
                <table className="attention-table">
                  <thead>
                    <tr>
                      <th>Customer / company</th>
                      <th>Document</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attention.map((document: any) => {
                      const customer = relation(document.customers);
                      const company = relation(document.companies);
                      const owner = customer?.full_name || company?.name || "Unassigned record";
                      const [status, tone] = statusFor(document.expires_on, document.status);
                      const target = document.customer_id
                        ? `/customers/${document.customer_id}`
                        : document.company_id
                          ? `/companies/${document.company_id}`
                          : "/customers";
                      return (
                        <tr key={document.id}>
                          <td>
                            <span className="person">
                              <span className="initial-avatar">{initials(owner)}</span>
                              <span>
                                <b>{owner}</b>
                                <small>
                                  {company?.name && customer ? company.name : "Document record"}
                                </small>
                              </span>
                            </span>
                          </td>
                          <td>
                            <b>{document.display_name || document.document_number || "Document"}</b>
                          </td>
                          <td>
                            <time className={`expiry-${tone}`} title={document.expires_on}>
                              {getRelativeExpiryText(document.expires_on)}
                            </time>
                          </td>
                          <td>
                            <span className={`status-pill ${tone}`}>{status}</span>
                          </td>
                          <td>
                            <Link className="table-action" href={target}>
                              View details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="attention-mobile-list">
                {attention.map((document: any) => {
                  const customer = relation(document.customers);
                  const company = relation(document.companies);
                  const owner = customer?.full_name || company?.name || "Unassigned record";
                  const [status, tone] = statusFor(document.expires_on, document.status);
                  const target = document.customer_id
                    ? `/customers/${document.customer_id}`
                    : document.company_id
                      ? `/companies/${document.company_id}`
                      : "/customers";
                  return (
                    <article className="attention-mobile-card" key={document.id}>
                      <span className="person">
                        <span className="initial-avatar">{initials(owner)}</span>
                        <span>
                          <b>{owner}</b>
                          <small>
                            {document.display_name || document.document_number || "Document"}
                          </small>
                        </span>
                      </span>
                      <span className={`status-pill ${tone}`}>
                        {status} - {getRelativeExpiryText(document.expires_on)}
                      </span>
                      <Link className="table-action" href={target}>
                        View details
                      </Link>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="dashboard-empty">
              <span aria-hidden>OK</span>
              <b>Nothing needs attention</b>
              <p>Your upcoming document expiries will appear here.</p>
            </div>
          )}
        </article>

        <article className="panel followups-panel">
          <div className="panel-heading">
            <div className="section-title">
              <span className="section-icon" aria-hidden>
                FU
              </span>
              <div>
                <h2>Today&apos;s Follow-Ups</h2>
                <p>Customers to contact today</p>
              </div>
            </div>
            <Link className="add-action" href="/follow-ups">
              + Add
            </Link>
          </div>
          {todaysFollowUps?.length ? (
            <div className="followup-list">
              {todaysFollowUps.map((item: any) => {
                const customer = relation(item.customers);
                const company = relation(item.companies);
                const person = customer?.full_name || company?.name || "Follow-up";
                const overdue = item.due_at < new Date().toISOString();
                return (
                  <article className="followup-item" key={item.id}>
                    <span className="initial-avatar">{initials(person)}</span>
                    <span className="followup-copy">
                      <b>{person}</b>
                      <small>{item.note || company?.name || "Follow-up"}</small>
                    </span>
                    <span className="followup-meta">
                      <time>
                        {new Intl.DateTimeFormat("en-AE", {
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(item.due_at))}
                      </time>
                      <span className={`status-pill ${overdue ? "warning" : "amber"}`}>
                        {overdue ? "Due" : "Pending"}
                      </span>
                    </span>
                    <form action={completeFollowUpAction}>
                      <input type="hidden" name="followUpId" value={item.id} />
                      <input type="hidden" name="customerResponse" value="" />
                      <input type="hidden" name="nextDueAt" value="" />
                      <input type="hidden" name="nextNote" value="" />
                      <button
                        aria-label={`Mark follow-up with ${person} complete`}
                        className="complete-check"
                        type="submit"
                      >
                        Complete
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <span aria-hidden>OK</span>
              <b>No follow-ups for today</b>
              <p>Scheduled customer contacts will appear here.</p>
            </div>
          )}
          <Link className="panel-footer-link" href="/follow-ups">
            View all {followUps ?? 0} follow-ups <span aria-hidden>&gt;</span>
          </Link>
        </article>
      </section>

      <section className="dashboard-secondary">
        <article className="panel document-health-panel">
          <div className="panel-heading">
            <div>
              <h2>Document Health</h2>
              <p>Your document portfolio at a glance.</p>
            </div>
            <span className="health-total">{healthTotal} tracked</span>
          </div>
          <div className="health-bar" aria-label="Document health distribution">
            {health.map(([label, value, tone]) => (
              <span
                className={`health-segment ${tone}`}
                key={label}
                style={{ flexGrow: Math.max(value, 0.15) }}
                title={`${label}: ${value}`}
              />
            ))}
          </div>
          <div className="health-stat-grid">
            {health.map(([label, value, tone]) => (
              <div className="health-stat" key={label}>
                <span className={`health-dot ${tone}`} aria-hidden />
                <span>{label}</span>
                <b>{value}</b>
                {healthTotal > 0 ? (
                  <small>{Math.round((value / healthTotal) * 100)}%</small>
                ) : (
                  <small>0%</small>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest changes in this workspace.</p>
            </div>
          </div>
          {activity?.length ? (
            <div className="activity-list">
              {activity.map((entry: any) => (
                <article className="activity-item" key={entry.id}>
                  <span className="activity-icon" aria-hidden>
                    {activityIcon(entry.entity_type)}
                  </span>
                  <p>{entry.message}</p>
                  <time>
                    {new Intl.DateTimeFormat("en-AE", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(entry.created_at))}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <span aria-hidden>RT</span>
              <b>No recent activity</b>
              <p>Workspace updates will appear here.</p>
            </div>
          )}
        </article>
      </section>
    </WorkspaceShell>
  );
}
