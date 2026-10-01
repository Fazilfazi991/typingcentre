import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { QuickScanFlow } from "./quick-scan-flow";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ScanPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  const context = await getWorkspaceContext("/scan");
  if (!context) redirect("/account-inactive" as never);
  const requirementId = (await searchParams).requirementId;
  let linkedRequirement: { id: string; requestId: string; customerId: string; customerName: string } | undefined;
  if (typeof requirementId === "string" && requirementId) {
    const { data: requirement } = await context.supabase.from("service_request_requirements").select("id,service_request_id").eq("organization_id",context.organization.id).eq("id",requirementId).maybeSingle();
    if (!requirement) notFound();
    const { data: request } = await context.supabase.from("service_requests").select("id,customer_id,customers(full_name)").eq("organization_id",context.organization.id).eq("id",requirement.service_request_id).maybeSingle();
    if (!request) notFound();
    const customer = Array.isArray(request.customers) ? request.customers[0] : request.customers;
    linkedRequirement = { id: requirement.id, requestId: request.id, customerId: request.customer_id, customerName: customer?.full_name ?? "Customer" };
  }
  const { data: documentTypes } = await context.supabase.from("organization_document_types").select("id, name").eq("organization_id", context.organization.id).eq("is_active", true).order("name");
  return <QuickScanFlow documentTypes={documentTypes ?? []} linkedRequirement={linkedRequirement} />;
}
