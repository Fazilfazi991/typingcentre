import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SmartUploadForm } from "@/features/documents/smart-upload-form";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function SmartDocumentUpload({ searchParams }: { searchParams: Promise<{ customerId?: string; companyId?: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const { customerId, companyId } = await searchParams;
  if ((!customerId && !companyId) || (customerId && companyId)) notFound();
  const [customerResult, companyResult, typesResult] = await Promise.all([
    customerId ? context.supabase.from("customers").select("id, full_name").eq("id", customerId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
    companyId ? context.supabase.from("companies").select("id, name").eq("id", companyId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
    context.supabase.from("organization_document_types").select("id, name").eq("organization_id", context.organization.id).eq("is_active", true).order("name"),
  ]);
  if ((!customerResult.data && customerId) || (!companyResult.data && companyId) || !typesResult.data?.length) notFound();
  return <WorkspaceShell organizationName={context.organization.name} activePath="/documents"><header className="page-heading"><Link href={customerId ? `/customers/${customerId}` : `/companies/${companyId}`}>Back</Link><h1>Add document</h1><p>Upload a scanned document and review extracted values before saving.</p></header><SmartUploadForm customerId={customerId} companyId={companyId} customerName={customerResult.data?.full_name} companyName={companyResult.data?.name} documentTypes={typesResult.data} /></WorkspaceShell>;
}
