import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  addRenewalNoteAction,
  closeRenewalAction,
  completeRenewalAction,
  markRenewalContactedAction,
  scheduleRenewalFollowUpAction,
} from "@/features/renewals/actions";
import { addCalendarDays, calculateDaysRemaining, expiryBoundaries, formatDateTime, formatDisplayDate, getRelativeExpiryText } from "@/lib/dates/expiry";
import { oneRelation } from "@/lib/renewals/records";
import { renewalRangeOrDefault, renewalReturnPath, workflowStatus } from "@/lib/renewals/workflow";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

function messageFor(params: Record<string, string | string[] | undefined>) {
  if (params.renewed === "1") return { tone: "success", text: "Renewal completed. The old document is retained in history and the replacement is now tracked." };
  if (params.contacted === "1") return { tone: "success", text: "Customer contact recorded." };
  if (params.followUp === "created") return { tone: "success", text: "Follow-up scheduled." };
  if (params.note === "added") return { tone: "success", text: "Renewal note added." };
  if (params.closed === "1") return { tone: "success", text: "Renewal closed as not interested." };
  if (params.error) return { tone: "error", text: "That action could not be completed. Review the details and try again." };
  return null;
}

export default async function RenewalDetail({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { documentId } = await params;
  const queryParams = await searchParams;
  const range = renewalRangeOrDefault(typeof queryParams.range === "string" ? queryParams.range : undefined);
  const context = await getWorkspaceContext(`/renewals/${documentId}?range=${range}`);
  if (!context) redirect("/account-inactive" as never);

  const { data: document } = await context.supabase.from("documents").select(
    "id,organization_id,document_type_id,customer_id,company_id,branch_id,display_name,document_number,issued_on,expires_on,status,notes,archived_at,customers(id,full_name,phone,whatsapp_number),companies(id,name,contact_phone,whatsapp_number),branches(name),organization_document_types(name)",
  ).eq("id", documentId).eq("organization_id", context.organization.id).maybeSingle();
  if (!document) notFound();

  const { data: renewals } = await context.supabase.from("renewals")
    .select("id,status,started_at,completed_at,notes,created_at,replacement_document_id")
    .eq("organization_id", context.organization.id)
    .eq("document_id", document.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const renewal = renewals?.[0] ?? null;

  const [followUpResult, activityResult, replacementResult, replacementActivityResult] = await Promise.all([
    context.supabase.from("follow_ups")
      .select("id,due_at,status,completed_at,note,customer_response,created_at")
      .eq("organization_id", context.organization.id)
      .eq("document_id", document.id)
      .order("created_at", { ascending: false })
      .limit(30),
    renewal ? context.supabase.from("activity_logs")
      .select("id,message,created_at,actor_user_id")
      .eq("organization_id", context.organization.id)
      .eq("entity_type", "renewal")
      .eq("entity_id", renewal.id)
      .order("created_at", { ascending: false })
      .limit(30) : Promise.resolve({ data: [] }),
    renewal?.replacement_document_id ? context.supabase.from("documents")
      .select("id,document_number,issued_on,expires_on,status,archived_at")
      .eq("organization_id", context.organization.id)
      .eq("id", renewal.replacement_document_id)
      .maybeSingle() : Promise.resolve({ data: null }),
    renewal?.replacement_document_id ? context.supabase.from("activity_logs")
      .select("id,message,created_at,actor_user_id")
      .eq("organization_id", context.organization.id)
      .eq("entity_type", "document")
      .eq("entity_id", renewal.replacement_document_id)
      .order("created_at", { ascending: false })
      .limit(30) : Promise.resolve({ data: [] }),
  ]);

  const customer = oneRelation<any>(document.customers);
  const company = oneRelation<any>(document.companies);
  const branch = oneRelation<any>(document.branches);
  const documentType = oneRelation<any>(document.organization_document_types);
  const owner = customer?.full_name || company?.name || "Document record";
  const ownerPath = customer ? `/customers/${customer.id}` : company ? `/companies/${company.id}` : "/documents";
  const phone = customer?.whatsapp_number || customer?.phone || company?.whatsapp_number || company?.contact_phone || null;
  const pendingFollowUp = (followUpResult.data ?? []).some((item: any) => item.status === "pending" || item.status === "overdue");
  const contacted = (activityResult.data ?? []).some((item: any) => /contacted/i.test(item.message));
  const status = workflowStatus({ renewalStatus: renewal?.status, hasPendingFollowUp: pendingFollowUp, hasContactActivity: contacted });
  const closed = status === "Renewed" || status === "Closed";
  const days = calculateDaysRemaining(document.expires_on, new Date(), context.organization.timezone);
  const today = expiryBoundaries(new Date(), context.organization.timezone).today;
  const replacementExpiry = addCalendarDays(today, 365);
  const alert = messageFor(queryParams);
  const timeline = [
    ...(activityResult.data ?? []).map((item: any) => ({ id: `activity-${item.id}`, date: item.created_at, title: item.message, detail: "Workspace activity" })),
    ...(replacementActivityResult.data ?? []).map((item: any) => ({ id: `replacement-activity-${item.id}`, date: item.created_at, title: item.message, detail: "Replacement document activity" })),
    ...(followUpResult.data ?? []).map((item: any) => ({ id: `follow-up-${item.id}`, date: item.created_at, title: item.status === "completed" ? "Follow-up completed" : "Follow-up scheduled", detail: `${item.note || "No note"} · Due ${formatDateTime(item.due_at)}` })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return <WorkspaceShell organizationName={context.organization.name} activePath="/renewals">
    <header className="page-heading split renewal-detail-heading">
      <div><Link className="back-link" href={renewalReturnPath(range)}>← Back to {range === "7d" ? "next 7 days" : range === "today" ? "today" : range === "expired" ? "expired documents" : range === "90d" ? "next 90 days" : "next 30 days"}</Link><p className="eyebrow">Renewal opportunity</p><h1>{owner}</h1><p>{documentType?.name || document.display_name || "Document"} · {getRelativeExpiryText(document.expires_on)}</p></div>
      <span className={`workflow-status workflow-${status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{status}</span>
    </header>
    {alert && <p className={`workflow-alert ${alert.tone}`} role="status">{alert.text}</p>}

    <section className="renewal-detail-grid">
      <article className="panel renewal-summary-card">
        <div className="panel-heading"><div><h2>Renewal summary</h2><p>Everything needed before contacting the customer.</p></div></div>
        <dl className="renewal-facts">
          <div><dt>Customer / company</dt><dd><Link href={ownerPath}>{owner}</Link>{customer && company?.name && <small>{company.name}</small>}</dd></div>
          <div><dt>Document</dt><dd><Link href={`/documents/${document.id}?from=renewal&range=${range}`}>{documentType?.name || document.display_name || "Document"}</Link><small>{document.document_number || "No number recorded"}</small></dd></div>
          <div><dt>Expiry</dt><dd>{formatDisplayDate(document.expires_on)}<small>{getRelativeExpiryText(document.expires_on)}</small></dd></div>
          <div><dt>Branch</dt><dd>{branch?.name || "Not assigned"}</dd></div>
          <div><dt>Mobile</dt><dd>{phone ? <a href={`tel:${phone.replace(/\D/g, "")}`}>{phone}</a> : "Not recorded"}</dd></div>
          <div><dt>Remaining</dt><dd>{days === undefined ? "Unavailable" : days < 0 ? `Expired ${Math.abs(days)} day${days === -1 ? "" : "s"} ago` : days === 0 ? "Expires today" : `${days} day${days === 1 ? "" : "s"} remaining`}</dd></div>
        </dl>
        <div className="renewal-record-links"><Link href={ownerPath}>View {customer ? "customer" : "company"}</Link><Link href={`/documents/${document.id}?from=renewal&range=${range}`}>View document</Link></div>
        {renewal?.notes && <div className="renewal-notes"><h3>Notes</h3><p>{renewal.notes}</p></div>}
      </article>

      <aside className="panel renewal-actions-card">
        <div className="panel-heading"><div><h2>Next action</h2><p>Update this opportunity without losing context.</p></div></div>
        {!closed ? <div className="renewal-action-stack">
          <form action={markRenewalContactedAction}><input type="hidden" name="documentId" value={document.id}/><input type="hidden" name="range" value={range}/><PendingSubmitButton className="primary-button" label="Mark contacted" pendingLabel="Saving…"/></form>
          <details><summary>Schedule follow-up</summary><form action={scheduleRenewalFollowUpAction} className="compact-action-form"><input type="hidden" name="documentId" value={document.id}/><input type="hidden" name="range" value={range}/><label>Next follow-up<input type="datetime-local" name="dueAt" required/></label><label>Note<input name="note" placeholder="What should happen next?" required/></label><PendingSubmitButton className="primary-button" label="Add follow-up" pendingLabel="Scheduling…"/></form></details>
          <details><summary>Add note</summary><form action={addRenewalNoteAction} className="compact-action-form"><input type="hidden" name="documentId" value={document.id}/><input type="hidden" name="range" value={range}/><label>Renewal note<textarea name="note" rows={3} required/></label><PendingSubmitButton className="primary-button" label="Save note" pendingLabel="Saving…"/></form></details>
          <details className="renewal-complete"><summary>Mark renewed</summary><form action={completeRenewalAction} className="compact-action-form"><input type="hidden" name="documentId" value={document.id}/><input type="hidden" name="range" value={range}/><label>New document number<input name="documentNumber"/></label><label>New issue date<input type="date" name="issueDate" defaultValue={today}/></label><label>New expiry date<input type="date" name="expiryDate" min={addCalendarDays(today, 1)} defaultValue={replacementExpiry} required/></label><label>Completion note<textarea name="note" rows={2}/></label><PendingSubmitButton className="success-button" label="Complete renewal" pendingLabel="Completing…"/></form></details>
          <details className="renewal-close"><summary>Not interested / close</summary><form action={closeRenewalAction} className="compact-action-form"><input type="hidden" name="documentId" value={document.id}/><input type="hidden" name="range" value={range}/><label>Reason<textarea name="note" rows={2} required/></label><PendingSubmitButton className="danger-button" label="Close renewal" pendingLabel="Closing…"/></form></details>
        </div> : replacementResult.data ? <div className="replacement-summary"><span aria-hidden>✓</span><h3>Replacement document active</h3><p>Expires {formatDisplayDate(replacementResult.data.expires_on)}</p><Link href={`/documents/${replacementResult.data.id}`}>View replacement</Link><Link href={`/documents/upload?documentId=${replacementResult.data.id}`}>Upload replacement file</Link></div> : <p className="empty-state">This renewal is closed.</p>}
      </aside>
    </section>

    <section className="panel renewal-history-panel">
      <div className="panel-heading"><div><h2>Activity history</h2><p>Contact, follow-up, and completion events are retained.</p></div></div>
      {timeline.length ? <ol className="renewal-timeline">{timeline.map((item) => <li key={item.id}><span aria-hidden/><div><b>{item.title}</b><p>{item.detail}</p></div><time>{formatDateTime(item.date)}</time></li>)}</ol> : <p className="empty-state">No renewal activity yet. Mark the customer contacted to begin.</p>}
    </section>
  </WorkspaceShell>;
}
