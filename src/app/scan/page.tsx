import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { QuickScanFlow } from "./quick-scan-flow";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const context = await getWorkspaceContext("/scan");
  if (!context) redirect("/account-inactive" as never);
  const { data: documentTypes } = await context.supabase.from("organization_document_types").select("id, name").eq("organization_id", context.organization.id).eq("is_active", true).order("name");
  return <QuickScanFlow documentTypes={documentTypes ?? []} />;
}
