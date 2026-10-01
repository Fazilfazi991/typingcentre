import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { WorkspaceShell } from "@/components/workspace-shell";
import { isDemoWorkspace } from "@/lib/demo/workspace";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { saveDemoPassportAction } from "./actions";
import "../../service-requests/service-requests.css";

export const dynamic = "force-dynamic";

export default async function DemoPassportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWorkspaceContext("/scan/demo");
  if (!context) redirect("/account-inactive" as never);
  if (!isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug })) notFound();
  const query = await searchParams;
  const requirementId = typeof query.requirementId === "string" ? query.requirementId : "";
  if (!z.string().uuid().safeParse(requirementId).success) notFound();
  const { data: requirement } = await context.supabase.from("service_request_requirements").select("id,name,document_type_id,service_request_id,service_requests(customer_id,external_reference,customers(full_name))").eq("organization_id", context.organization.id).eq("id", requirementId).maybeSingle();
  const request = requirement && (Array.isArray(requirement.service_requests) ? requirement.service_requests[0] : requirement.service_requests);
  const customer = request && (Array.isArray(request.customers) ? request.customers[0] : request.customers);
  if (!requirement || requirement.name !== "Passport" || !requirement.document_type_id || request?.external_reference !== "DEMO-SR-001") notFound();
  return <WorkspaceShell organizationName={context.organization.name} activePath="/service-requests">
    <header className="page-heading"><Link href={`/service-requests/${requirement.service_request_id}#checklist`}>← Back to request</Link><p className="eyebrow">Demo simulation · Passport review</p><h1>Review passport details</h1><p>For {customer?.full_name ?? "Ahmed Hassan"}. This sample represents the review step. No file was uploaded and no AI extraction ran.</p></header>
    {typeof query.error === "string" && <p className="form-error">{query.error}</p>}
    <div className="demo-scan-grid"><article className="panel demo-passport-preview" aria-label="Fictional passport preview"><span>DEMO PREVIEW · FICTIONAL DATA</span><div><small>PASSPORT</small><b>{customer?.full_name ?? "Ahmed Hassan"}</b><p>Nationality · Egyptian</p><p>Passport no. · N1234567</p><p>Expires · 16 Aug 2028</p></div><small>No document image or binary is stored by this simulation.</small></article>
      <section className="panel service-card"><h2>Confirm details</h2><p>Review these fictional values before attaching a document record to the checklist.</p><form action={saveDemoPassportAction} className="service-form"><input type="hidden" name="requirementId" value={requirement.id}/><label>Document type<input value="Passport" readOnly/></label><label>Customer<input value={customer?.full_name ?? "Ahmed Hassan"} readOnly/></label><label>Passport number<input name="documentNumber" defaultValue="N1234567" pattern="[A-Za-z0-9-]{4,30}" required/></label><label>Expiry date<input name="expiresOn" type="date" defaultValue="2028-08-16" required/></label><p className="service-wide demo-simulation-note">Saving creates a fictional metadata record and marks Passport as Received. It does not upload a scan.</p><button className="primary-button service-wide">Save demo passport to request</button></form></section></div>
  </WorkspaceShell>;
}
