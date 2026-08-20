import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { calculateDaysRemaining } from "@/lib/dates/expiry";
import { documentStatus, documentTypeName, getReportData, ownerName } from "@/lib/reports/data";
import { reportFiltersFromSearchParams, reportRangeLabel } from "@/lib/reports/filters";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { ReportsFilterToolbar } from "./reports-filter-toolbar";
import "./reports.module.css";

export const dynamic = "force-dynamic";

function reportQuery(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params.toString();
}

function dateLabel(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-AE", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = reportFiltersFromSearchParams(params);
  const context = await getWorkspaceContext(
    `/reports?${reportQuery({ range: filters.range, owner: filters.owner, type: filters.typeId, sort: filters.sort, start: filters.start, end: filters.end })}`,
  );
  if (!context) redirect("/account-inactive" as never);
  const now = new Date();
  const report = await getReportData(context, filters, now);
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const rowsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(report.documents.length / rowsPerPage));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageDocuments = report.documents.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const reportParams = {
    range: filters.range,
    owner: filters.owner,
    type: filters.typeId,
    sort: filters.sort,
    start: filters.start,
    end: filters.end,
  };
  const pageHref = (nextPage: number) =>
    `/reports?${reportQuery({ ...reportParams, page: String(nextPage) })}`;
  const exportHref = `/api/reports/export?${reportQuery(reportParams)}`;
  const expiryCards = [
    ["Expired", report.expiry.expired, "danger"],
    ["Due today", report.expiry.today, "warning"],
    ["Next 7 days", report.expiry.next7, "warning"],
    ["Next 30 days", report.expiry.next30, "info"],
    ["Later / active", report.expiry.active, "success"],
  ] as const;

  return (
    <WorkspaceShell organizationName={context.organization.name} activePath="/reports">
      <header className="page-heading split reports-heading">
        <div>
          <p className="eyebrow">Workspace insights</p>
          <h1>Reports</h1>
          <p>Workspace insights for expiries, documents and follow-ups.</p>
        </div>
        <a className="secondary-button reports-export" href={exportHref}>
          <span aria-hidden>↓</span> Export CSV
        </a>
      </header>
      <ReportsFilterToolbar filters={filters} types={report.types} />
      <p className="reports-context">
        Reporting period: <b>{reportRangeLabel(filters)}</b>
      </p>
      <section aria-label="Expiry summary">
        <h2 className="reports-section-title">Expiry summary</h2>
        <div className="metric-grid reports-metric-grid">
          {expiryCards.map(([label, value, tone]) => (
            <article className={`metric-card reports-kpi metric-${tone}`} key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
              <em>documents</em>
            </article>
          ))}
        </div>
      </section>
      <section className="reports-two-column">
        <article className="panel reports-breakdown reports-insight-panel">
          <h2>Document breakdown</h2>
          {report.breakdown.length ? (
            <ul>
              {report.breakdown.map(([type, count]) => (
                <li key={type}>
                  <span>{type}</span>
                  <b>{count}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No records found for this report.</p>
          )}
        </article>
        <article className="panel reports-breakdown reports-insight-panel">
          <h2>Customer &amp; company summary</h2>
          <ul>
            <li>
              <span>Total customers</span>
              <b>{report.customers.total}</b>
            </li>
            <li>
              <span>Customers with upcoming expiries</span>
              <b>{report.customers.upcoming}</b>
            </li>
            <li>
              <span>Total companies</span>
              <b>{report.companies.total}</b>
            </li>
            <li>
              <span>Companies with upcoming expiries</span>
              <b>{report.companies.upcoming}</b>
            </li>
          </ul>
        </article>
        <article className="panel reports-breakdown reports-insight-panel reports-follow-up-insight">
          <h2>Follow-up summary</h2>
          <ul>
            <li>
              <span>Overdue</span>
              <b>{report.followUps.overdue}</b>
            </li>
            <li>
              <span>Due today</span>
              <b>{report.followUps.today}</b>
            </li>
            <li>
              <span>Upcoming</span>
              <b>{report.followUps.upcoming}</b>
            </li>
            <li>
              <span>Completed</span>
              <b>{report.followUps.completed}</b>
            </li>
          </ul>
        </article>
      </section>
      <section className="panel table-panel reports-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Document report</h2>
            <p>
              {report.documents.length} document{report.documents.length === 1 ? "" : "s"} match the
              selected filters.
            </p>
          </div>
        </div>
        {report.documents.length ? (
          <>
            <div className="reports-table-wrap">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>Customer / Company</th>
                    <th>Document type</th>
                    <th>Document number</th>
                    <th>Expiry date</th>
                    <th>Remaining days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageDocuments.map((document) => {
                    const days = calculateDaysRemaining(
                      document.expires_on,
                      now,
                      context.organization.timezone,
                    );
                    const status = documentStatus(document, now, context.organization.timezone);
                    const statusLabel = status === "Expiring today" ? "Due today" : status;
                    const tone =
                      status === "Expired" ? "danger" : status === "Active" ? "success" : "warning";
                    return (
                      <tr key={document.id} className="renewal-table-row">
                        <td>
                          <Link className="renewal-row-link" href={`/documents/${document.id}`}>
                            {ownerName(document)}
                          </Link>
                        </td>
                        <td>
                          <Link className="renewal-row-link" href={`/documents/${document.id}`}>
                            {documentTypeName(document)}
                          </Link>
                        </td>
                        <td>
                          <Link className="renewal-row-link" href={`/documents/${document.id}`}>
                            {document.document_number || "Not recorded"}
                          </Link>
                        </td>
                        <td>{dateLabel(document.expires_on, context.organization.timezone)}</td>
                        <td>
                          {days === undefined
                            ? "-"
                            : days < 0
                              ? `${Math.abs(days)} days overdue`
                              : days === 0
                                ? "Due today"
                                : `In ${days} days`}
                        </td>
                        <td>
                          <span className={`status-pill ${tone}`}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-card-list reports-mobile-list">
              {pageDocuments.map((document) => {
                const days = calculateDaysRemaining(
                  document.expires_on,
                  now,
                  context.organization.timezone,
                );
                const status = documentStatus(document, now, context.organization.timezone);
                return (
                  <Link
                    key={document.id}
                    href={`/documents/${document.id}`}
                    className="mobile-record-card"
                  >
                    <b>{ownerName(document)}</b>
                    <small>
                      {documentTypeName(document)} · {document.document_number || "No number"}
                    </small>
                    <dl>
                      <div>
                        <dt>Expiry</dt>
                        <dd>{dateLabel(document.expires_on, context.organization.timezone)}</dd>
                      </div>
                      <div>
                        <dt>Remaining</dt>
                        <dd>
                          {days === undefined
                            ? "-"
                            : days < 0
                              ? `${Math.abs(days)} days overdue`
                              : days === 0
                                ? "Due today"
                                : `In ${days} days`}
                        </dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{status === "Expiring today" ? "Due today" : status}</dd>
                      </div>
                    </dl>
                  </Link>
                );
              })}
            </div>
            {totalPages > 1 && (
              <nav className="reports-pagination" aria-label="Document report pagination">
                {page === 1 ? (
                  <span className="is-disabled">Previous</span>
                ) : (
                  <Link href={pageHref(page - 1)}>Previous</Link>
                )}
                <span>
                  Page {page} of {totalPages}
                </span>
                {page === totalPages ? (
                  <span className="is-disabled">Next</span>
                ) : (
                  <Link href={pageHref(page + 1)}>Next</Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="empty-state">No records found for this report.</div>
        )}
      </section>
    </WorkspaceShell>
  );
}
