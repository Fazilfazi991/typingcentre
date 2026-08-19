import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateFollowUpAction } from "@/features/crm/actions";
import { isSafeUuid } from "@/features/crm/customer-utils";
import { SearchableOwnerCombobox } from "@/components/searchable-owner-combobox";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";
export default async function FollowUpEdit({ params }: { params: Promise<{ followUpId: string }> }) {
  const context = await getWorkspaceContext(); if (!context) redirect("/account-inactive" as never);
  const { followUpId } = await params; if (!isSafeUuid(followUpId)) notFound();
  const { data: followUp } = await context.supabase.from("follow_ups").select("id,customer_id,company_id,due_at,status,note,customers(full_name),companies(name)").eq("id", followUpId).eq("organization_id", context.organization.id).maybeSingle();
  if (!followUp) notFound();
  const customer = Array.isArray(followUp.customers) ? followUp.customers[0] : followUp.customers;
  const company = Array.isArray(followUp.companies) ? followUp.companies[0] : followUp.companies;
  return <WorkspaceShell organizationName={context.organization.name}><header className="page-heading"><Link href="/follow-ups">Back to follow-ups</Link><h1>Edit follow-up</h1></header><section className="panel">{followUp.status === "completed" ? <p className="empty-state">Completed follow-ups are read-only.</p> : <form action={updateFollowUpAction} className="record-form"><input type="hidden" name="followUpId" value={followUp.id}/><input type="hidden" name="returnTo" value="/follow-ups"/><label>Customer<SearchableOwnerCombobox kind="customer" name="customerId" selected={followUp.customer_id ? { id: followUp.customer_id, label: customer?.full_name || "Selected customer" } : null}/></label><label>Company<SearchableOwnerCombobox kind="company" name="companyId" selected={followUp.company_id ? { id: followUp.company_id, label: company?.name || "Selected company" } : null}/></label><label>Due date *<input name="dueAt" type="datetime-local" defaultValue={followUp.due_at.slice(0,16)} required/></label><label>Note<input name="note" defaultValue={followUp.note || ""}/></label><button className="primary-button">Save changes</button></form>}</section></WorkspaceShell>;
}
