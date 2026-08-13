import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatDateTime, formatDisplayDate, getRelativeExpiryText } from "@/lib/dates/expiry";
import { oneRelation } from "@/lib/renewals/records";
import { renewalDetailPath, renewalRangeOrDefault } from "@/lib/renewals/workflow";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function DocumentDetail({ params, searchParams }: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { documentId } = await params;
  const query = await searchParams;
  const range = renewalRangeOrDefault(typeof query.range === "string" ? query.range : undefined);
  const returnTo = query.from === "renewal" ? renewalDetailPath(documentId, range) : "/documents";
  const context = await getWorkspaceContext(`/documents/${documentId}`);
  if (!context) redirect("/account-inactive" as never);
  const [{ data: document }, { data: versions }] = await Promise.all([
    context.supabase.from("documents").select("id,customer_id,company_id,display_name,document_number,issued_on,expires_on,status,notes,archived_at,created_at,customers(id,full_name),companies(id,name),branches(name),organization_document_types(name)").eq("id", documentId).eq("organization_id", context.organization.id).maybeSingle(),
    context.supabase.from("document_versions").select("id,version_number,original_filename,mime_type,upload_status,created_at").eq("document_id", documentId).eq("organization_id", context.organization.id).order("version_number", { ascending: false }),
  ]);
  if (!document) notFound();
  const customer = oneRelation<any>(document.customers);
  const company = oneRelation<any>(document.companies);
  const branch = oneRelation<any>(document.branches);
  const type = oneRelation<any>(document.organization_document_types);
  const owner = customer?.full_name || company?.name || "Document record";
  return <WorkspaceShell organizationName={context.organization.name} activePath="/documents">
    <header className="page-heading split"><div><Link className="back-link" href={returnTo}>← Back</Link><p className="eyebrow">Document record</p><h1>{type?.name || document.display_name || "Document"}</h1><p>{owner}</p></div>{!document.archived_at && <Link className="primary-button" href={`/documents/upload?documentId=${document.id}`}>Upload new version</Link>}</header>
    {document.archived_at && <p className="workflow-alert info">Historical document retained after renewal. It is no longer included in pending expiry lists.</p>}
    <section className="renewal-detail-grid"><article className="panel"><div className="panel-heading"><div><h2>Document details</h2><p>Tenant-scoped metadata and expiry information.</p></div></div><dl className="renewal-facts"><div><dt>Owner</dt><dd>{customer ? <Link href={`/customers/${customer.id}`}>{owner}</Link> : company ? <Link href={`/companies/${company.id}`}>{owner}</Link> : owner}</dd></div><div><dt>Document number</dt><dd>{document.document_number || "Not recorded"}</dd></div><div><dt>Issue date</dt><dd>{formatDisplayDate(document.issued_on)}</dd></div><div><dt>Expiry date</dt><dd>{formatDisplayDate(document.expires_on)}<small>{getRelativeExpiryText(document.expires_on)}</small></dd></div><div><dt>Branch</dt><dd>{branch?.name || "Not assigned"}</dd></div><div><dt>Status</dt><dd>{document.archived_at ? "Historical" : document.status.replace(/_/g, " ")}</dd></div></dl>{document.notes && <div className="renewal-notes"><h3>Notes</h3><p>{document.notes}</p></div>}</article>
    <article className="panel"><div className="panel-heading"><div><h2>File versions</h2><p>Previous uploads remain available as retained history.</p></div></div>{versions?.length ? <div className="stack">{versions.map((version: any) => <div className="row" key={version.id}><span><b>Version {version.version_number}</b><small>{version.original_filename} · {version.mime_type}</small></span><span><span className={`status-pill ${version.upload_status === "complete" ? "success" : "warning"}`}>{version.upload_status}</span><time>{formatDateTime(version.created_at)}</time></span></div>)}</div> : <p className="empty-state">No file has been uploaded for this document yet.</p>}</article></section>
  </WorkspaceShell>;
}
