import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { applyExpiryBucket, expiryBucketFromQuery, expiryBucketLabel, formatDisplayDate, getRelativeExpiryText } from "@/lib/dates/expiry";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const relation = <T,>(item: T | T[] | null | undefined) => (Array.isArray(item) ? item[0] : item);

export default async function Documents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const rawExpiry = (await searchParams).expiry;
  const bucket = expiryBucketFromQuery(typeof rawExpiry === "string" ? rawExpiry : undefined);
  let query = context.supabase.from("documents").select("id,document_number,expires_on,status,customer_id,company_id,customers(full_name),companies(name),organization_document_types(name)").eq("organization_id", context.organization.id).is("archived_at", null);
  if (bucket) query = applyExpiryBucket(query, bucket, new Date(), context.organization.timezone);
  const { data: documents } = await query.order("expires_on").limit(100);

  return <WorkspaceShell organizationName={context.organization.name} activePath="/documents">
    <header className="page-heading split"><div><p className="eyebrow">Documents</p><h1>Documents</h1><p>{bucket ? `${expiryBucketLabel(bucket)} expiry records.` : "Track document expiries for this workspace."}</p></div></header>
    {bucket && <div className="active-filter"><span>Expiry: {expiryBucketLabel(bucket)}</span><Link href="/documents">Clear filter</Link></div>}
    <section className="panel table-panel">{documents?.length ? <table className="desktop-table"><thead><tr><th>Customer / Company</th><th>Document</th><th>Document number</th><th>Expiry date</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{documents.map((document: any) => { const customer = relation(document.customers); const company = relation(document.companies); const type = relation(document.organization_document_types); const relative = getRelativeExpiryText(document.expires_on); const expired = relative.startsWith("Expired"); return <tr key={document.id}><td>{customer?.full_name || company?.name || "Document record"}<small>{customer && company?.name ? company.name : ""}</small></td><td>{type?.name || "Document"}</td><td>{document.document_number || "Not recorded"}</td><td>{formatDisplayDate(document.expires_on)}</td><td className={expired ? "expiry-danger" : "expiry-warning"}>{relative}</td><td><span className={`status-pill ${expired ? "danger" : "warning"}`}>{expired ? "Expired" : "Active"}</span></td></tr>; })}</tbody></table> : <div className="empty-state">No documents match this expiry filter.</div>}</section>
  </WorkspaceShell>;
}
