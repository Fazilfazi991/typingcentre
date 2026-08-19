import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SmartUploadForm } from "@/features/documents/smart-upload-form";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { DocumentOwnerPicker } from "./document-owner-picker";

export const dynamic = "force-dynamic";

export default async function SmartDocumentUpload({ searchParams }: { searchParams: Promise<{ customerId?: string; companyId?: string; documentId?: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const { customerId, companyId, documentId } = await searchParams;
  if ([customerId, companyId, documentId].filter(Boolean).length > 1) notFound();
  const [customerResult, companyResult, documentResult, typesResult] = await Promise.all([
    customerId ? context.supabase.from("customers").select("id, full_name").eq("id", customerId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
    companyId ? context.supabase.from("companies").select("id, name").eq("id", companyId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
    documentId ? context.supabase.from("documents").select("id,customer_id,company_id,display_name,customers(full_name),companies(name)").eq("id", documentId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
    context.supabase.from("organization_document_types").select("id, name").eq("organization_id", context.organization.id).eq("is_active", true).order("name"),
  ]);
  if ((!customerResult.data && customerId) || (!companyResult.data && companyId) || (!documentResult.data && documentId) || !typesResult.data?.length) notFound();
  const existingCustomer = Array.isArray(documentResult.data?.customers) ? documentResult.data.customers[0] : documentResult.data?.customers;
  const existingCompany = Array.isArray(documentResult.data?.companies) ? documentResult.data.companies[0] : documentResult.data?.companies;
  if (!customerId && !companyId && !documentId) return <WorkspaceShell organizationName={context.organization.name} activePath="/documents"><header className="page-heading"><Link href="/documents">Back</Link><h1>Add document</h1><p>Choose an owner before uploading a scanned document.</p></header><DocumentOwnerPicker /></WorkspaceShell>;
  const backPath = documentId ? `/documents/${documentId}` : customerId ? `/customers/${customerId}` : `/companies/${companyId}`;
  return <WorkspaceShell organizationName={context.organization.name} activePath="/documents"><header className="page-heading"><Link href={backPath}>Back</Link><h1>{documentId ? "Upload document version" : "Add document"}</h1><p>Upload a scanned document and review extracted values before saving.</p></header><SmartUploadForm documentId={documentId} customerId={customerId} companyId={companyId} customerName={customerResult.data?.full_name || existingCustomer?.full_name} companyName={companyResult.data?.name || existingCompany?.name} documentTypes={typesResult.data} /></WorkspaceShell>;
}
