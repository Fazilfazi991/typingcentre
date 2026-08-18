import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { QuickScanFlow } from "./quick-scan-flow";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const context = await getWorkspaceContext("/scan");
  if (!context) redirect("/account-inactive" as never);
  const [customers, companies, documentTypes] = await Promise.all([
    context.supabase.from("customers").select("id, full_name, phone").eq("organization_id", context.organization.id).is("archived_at", null).order("updated_at", { ascending: false }).limit(30),
    context.supabase.from("companies").select("id, name").eq("organization_id", context.organization.id).is("archived_at", null).order("updated_at", { ascending: false }).limit(30),
    context.supabase.from("organization_document_types").select("id, name").eq("organization_id", context.organization.id).eq("is_active", true).order("name"),
  ]);
  return <QuickScanFlow customers={customers.data ?? []} companies={companies.data ?? []} documentTypes={documentTypes.data ?? []} />;
}
