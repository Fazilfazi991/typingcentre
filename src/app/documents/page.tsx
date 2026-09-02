import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { applyExpiryBucket, expiryBucketFromQuery, expiryBucketLabel, formatDisplayDate, getRelativeExpiryText } from "@/lib/dates/expiry";
import { normalizeSearchTerm, postgrestSearchPattern } from "@/lib/search/query";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const relation = <T,>(item: T | T[] | null | undefined) => (Array.isArray(item) ? item[0] : item);

export default async function Documents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const params = await searchParams;
  const rawExpiry = params.expiry;
  const bucket = expiryBucketFromQuery(typeof rawExpiry === "string" ? rawExpiry : undefined);
  const search = normalizeSearchTerm(params.search);
  let query = context.supabase.from("documents").select("id,display_name,document_number,expires_on,status,extraction_status,created_at,customer_id,company_id,customers(full_name),companies(name),organization_document_types(name)").eq("organization_id", context.organization.id).is("archived_at", null);
  if (bucket) query = applyExpiryBucket(query, bucket, new Date(), context.organization.timezone);
  if (search.length >= 2) {
    const pattern = postgrestSearchPattern(search);
    query = query.or(`display_name.ilike.${pattern},document_number.ilike.${pattern}`);
  }
  const { data: documents, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error) throw error;

  const processingLabel = (value: string | null) => ({
    processing: "Processing",
    review_required: "Ready for review",
    confirmed: "Saved",
    failed: "Needs retry",
    not_started: "Uploaded",
  }[value ?? "not_started"] ?? "Uploaded");

  return <WorkspaceShell organizationName={context.organization.name} activePath="/documents">
    <header className="page-heading split"><div><p className="eyebrow">Documents</p><h1>Documents</h1><p>{bucket ? `${expiryBucketLabel(bucket)} expiry records.` : "Track uploaded documents and their processing state."}</p></div><Link className="primary-button" href="/documents/upload">Upload document</Link></header>
    <form className="filter-bar">
      <label>Search documents<input name="search" defaultValue={search} placeholder="Search name or document number" /></label>
      {bucket && <input type="hidden" name="expiry" value={bucket} />}
      <button>Search</button>
    </form>
    {bucket && <div className="active-filter"><span>Expiry: {expiryBucketLabel(bucket)}</span><Link href="/documents">Clear filter</Link></div>}
    <section className="panel table-panel">{documents?.length ? <><table className="desktop-table"><thead><tr><th>Customer / Company</th><th>Document</th><th>Document number</th><th>Uploaded</th><th>Processing</th><th>Expiry</th></tr></thead><tbody>{documents.map((document: any) => { const customer = relation(document.customers); const company = relation(document.companies); const type = relation(document.organization_document_types); const relative = document.expires_on ? getRelativeExpiryText(document.expires_on) : "No expiry"; const expired = relative.startsWith("Expired"); const href = `/documents/${document.id}`; return <tr className="renewal-table-row" key={document.id}><td><Link className="renewal-row-link" href={href}>{customer?.full_name || company?.name || "Document record"}<small>{customer && company?.name ? company.name : ""}</small></Link></td><td><Link className="renewal-row-link" href={href}>{type?.name || document.display_name || "Document"}</Link></td><td><Link className="renewal-row-link" href={href}>{document.document_number || "Not recorded"}</Link></td><td>{formatDisplayDate(document.created_at)}</td><td><span className="status-pill">{processingLabel(document.extraction_status)}</span></td><td className={expired ? "expiry-danger" : ""}>{document.expires_on ? <>{formatDisplayDate(document.expires_on)}<small>{relative}</small></> : "No expiry recorded"}</td></tr>; })}</tbody></table><div className="mobile-card-list document-mobile-list">{documents.map((document: any) => { const customer = relation(document.customers); const company = relation(document.companies); const type = relation(document.organization_document_types); const relative = document.expires_on ? getRelativeExpiryText(document.expires_on) : "No expiry"; const expired = relative.startsWith("Expired"); const href = `/documents/${document.id}`; return <Link className="document-mobile-card" href={href} key={document.id}><span className="document-mobile-heading"><b>{type?.name || document.display_name || "Document"}</b><span className="status-pill">{processingLabel(document.extraction_status)}</span></span><span className="document-mobile-owner">{customer?.full_name || company?.name || "Document record"}</span><span className="document-mobile-meta"><span><small>Uploaded</small><b>{formatDisplayDate(document.created_at)}</b><em className={expired ? "expiry-danger" : ""}>{relative}</em></span><span><small>Number</small><b>{document.document_number || "Not recorded"}</b></span></span><span className="document-mobile-action">View document <span aria-hidden>→</span></span></Link>; })}</div></> : <div className="empty-state">{search ? `No documents match “${search}”.` : bucket ? "No documents match this expiry filter." : "No documents uploaded yet. Add a customer document to begin."}</div>}</section>
  </WorkspaceShell>;
}
