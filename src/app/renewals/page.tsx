import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { applyRenewalRange, calculateDaysRemaining, formatDisplayDate, renewalRangeFromQuery, renewalRangeLabel, renewalRangePath, type RenewalRange } from "@/lib/dates/expiry";
import { isRelevantExpiryRecord, oneRelation, RENEWAL_WORKFLOW_RECORD_SELECT } from "@/lib/renewals/records";
import { renewalDetailPath, renewalRemainingText, workflowStatus } from "@/lib/renewals/workflow";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";
const ranges: RenewalRange[] = ["expired", "today", "7d", "30d", "90d"];

export default async function RenewalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawRange = (await searchParams).range;
  const range = renewalRangeFromQuery(typeof rawRange === "string" ? rawRange : undefined);
  if (!range) redirect(renewalRangePath("30d") as never);
  const destination = renewalRangePath(range);
  const context = await getWorkspaceContext(destination);
  if (!context) redirect("/account-inactive" as never);

  const now = new Date();
  let query = context.supabase.from("documents").select(RENEWAL_WORKFLOW_RECORD_SELECT).eq("organization_id", context.organization.id).is("archived_at", null);
  query = applyRenewalRange(query, range, now, context.organization.timezone);
  const { data, error } = await query.order("expires_on").limit(500);
  if (error) throw error;
  const records = (data ?? []).filter((record: any) => record.organization_id === context.organization.id && isRelevantExpiryRecord(record));

  return <WorkspaceShell organizationName={context.organization.name} activePath="/renewals">
    <header className="page-heading split renewals-heading"><div><p className="eyebrow">Renewals</p><h1>{renewalRangeLabel(range)}</h1><p>{records.length} relevant customer or company document{records.length === 1 ? "" : "s"}.</p></div><nav className="renewal-range-nav" aria-label="Renewal range">{ranges.map((item) => <Link key={item} href={renewalRangePath(item)} aria-current={item === range ? "page" : undefined}>{renewalRangeLabel(item)}</Link>)}</nav></header>
    <section className="panel table-panel renewals-table-panel">
      {records.length ? <>
        <table className="desktop-table"><thead><tr><th>Customer / company</th><th>Document</th><th>Branch / mobile</th><th>Expiry date</th><th>Remaining</th><th>Renewal status</th><th>Action</th></tr></thead><tbody>{records.map((record: any) => {
          const customer = oneRelation<any>(record.customers);
          const company = oneRelation<any>(record.companies);
          const branch = oneRelation<any>(record.branches);
          const type = oneRelation<any>(record.organization_document_types);
          const days = calculateDaysRemaining(record.expires_on, now, context.organization.timezone);
          const ownerPath = customer ? `/customers/${record.customer_id}` : company ? `/companies/${record.company_id}` : "/documents";
          const detailPath = renewalDetailPath(record.id, range);
          const latestRenewal = [...(record.renewals ?? [])].sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
          const pendingFollowUp = (record.follow_ups ?? []).some((item: any) => item.status === "pending" || item.status === "overdue");
          const status = workflowStatus({ renewalStatus: latestRenewal?.status, hasPendingFollowUp: pendingFollowUp });
          const tone = status === "Renewed" ? "success" : status === "Closed" ? "muted" : status === "Follow-up" ? "purple" : days !== undefined && days <= 7 ? "warning" : "info";
          const phone = customer?.whatsapp_number || customer?.phone || company?.whatsapp_number || company?.contact_phone;
          return <tr className="renewal-table-row" key={record.id}><td><Link className="renewal-row-link" href={detailPath}><b>{customer?.full_name || company?.name || "Document record"}</b>{customer && company?.name && <small>{company.name}</small>}</Link></td><td><Link className="renewal-row-link" href={detailPath}><b>{type?.name || record.display_name || "Document"}</b><small>{record.document_number || "No number"}</small></Link></td><td><span>{branch?.name || "Not assigned"}</span><small>{phone || "No mobile"}</small></td><td>{formatDisplayDate(record.expires_on)}</td><td>{renewalRemainingText(days)}</td><td><span className={`status-pill ${tone}`}>{status}</span></td><td><div className="renewal-row-actions"><Link className="table-action" href={detailPath}>Review</Link><Link href={ownerPath}>Profile</Link></div></td></tr>;
        })}</tbody></table>
        <div className="mobile-card-list" aria-label="Renewal records">{records.map((record: any) => {
          const customer = oneRelation<any>(record.customers);
          const company = oneRelation<any>(record.companies);
          const branch = oneRelation<any>(record.branches);
          const type = oneRelation<any>(record.organization_document_types);
          const days = calculateDaysRemaining(record.expires_on, now, context.organization.timezone);
          const latestRenewal = [...(record.renewals ?? [])].sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
          const pendingFollowUp = (record.follow_ups ?? []).some((item: any) => item.status === "pending" || item.status === "overdue");
          const status = workflowStatus({ renewalStatus: latestRenewal?.status, hasPendingFollowUp: pendingFollowUp });
          return <Link className="mobile-record-card renewal-mobile-card" href={renewalDetailPath(record.id, range)} key={record.id}><div><b>{customer?.full_name || company?.name || "Document record"}</b><small>{type?.name || record.display_name || "Document"}{branch?.name ? ` · ${branch.name}` : ""}</small></div><dl><div><dt>Expiry</dt><dd>{formatDisplayDate(record.expires_on)}</dd></div><div><dt>Remaining</dt><dd>{renewalRemainingText(days)}</dd></div><div><dt>Status</dt><dd>{status}</dd></div></dl><span className="table-action">Review renewal</span></Link>;
        })}</div>
      </> : <div className="empty-state">No active expiry records match this attention window.</div>}
    </section>
  </WorkspaceShell>;
}
