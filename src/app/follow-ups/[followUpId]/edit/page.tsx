import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateFollowUpAction } from "@/features/crm/actions";
import { isSafeUuid } from "@/features/crm/customer-utils";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function FollowUpEdit({ params, searchParams }: { params: Promise<{ followUpId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const { followUpId } = await params;
  if (!isSafeUuid(followUpId)) notFound();
  const { data: followUp } = await context.supabase.from("follow_ups").select("id,customer_id,due_at,status,note,customers(full_name)").eq("id", followUpId).eq("organization_id", context.organization.id).maybeSingle();
  if (!followUp) notFound();
  const query = await searchParams;
  const error = typeof query.error === "string" ? decodeURIComponent(query.error) : "";
  const customer = Array.isArray(followUp.customers) ? followUp.customers[0] : followUp.customers;
  return <WorkspaceShell organizationName={context.organization.name}><header className="page-heading"><Link href="/follow-ups">Back to follow-ups</Link><h1>Edit follow-up</h1><p>{customer?.full_name ?? "Customer"}</p></header><section className="panel">{error && <p className="form-error">{error}</p>}{followUp.status === "completed" ? <p className="empty-state">Completed follow-ups are read-only.</p> : <form action={updateFollowUpAction} className="record-form"><input type="hidden" name="followUpId" value={followUp.id}/><input type="hidden" name="customerId" value={followUp.customer_id}/><input type="hidden" name="returnTo" value="/follow-ups"/><label>Due date *<input name="dueAt" type="datetime-local" defaultValue={followUp.due_at.slice(0,16)} required/></label><label>Note<input name="note" defaultValue={followUp.note || ""}/></label><button className="primary-button">Save changes</button></form>}</section></WorkspaceShell>;
}
