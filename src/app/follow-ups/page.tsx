import Link from "next/link";
import { redirect } from "next/navigation";
import { createFollowUpAction, completeFollowUpAction, updateFollowUpAction } from "@/features/crm/actions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function FollowUps() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const now = new Date().toISOString();
  const [{ data: customers }, { data: followUps }] = await Promise.all([
    context.supabase.from("customers").select("id,full_name").eq("organization_id", context.organization.id).is("archived_at", null).order("full_name"),
    context.supabase.from("follow_ups").select("id,customer_id,due_at,status,note,customers(full_name)").eq("organization_id", context.organization.id).order("due_at").limit(50),
  ]);
  return <WorkspaceShell organizationName={context.organization.name}><header className="page-heading"><p className="eyebrow">Tasks</p><h1>Follow-ups</h1><p>Customer follow-ups for this workspace.</p></header><section className="panel"><h2>Add follow-up</h2><form action={createFollowUpAction} className="compact-form"><input type="hidden" name="returnTo" value="/follow-ups"/><label>Customer<select name="customerId" required><option value="">Select customer</option>{customers?.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}</select></label><label>Due date<input name="dueAt" type="datetime-local" required/></label><label>Note<input name="note" placeholder="Follow-up note"/></label><button>Add follow-up</button></form></section><section className="panel table-panel"><h2>Scheduled follow-ups</h2>{followUps?.length ? <div className="stack">{followUps.map((item: any) => { const overdue=item.status === "pending" && item.due_at < now; const state=item.status === "completed" ? "Completed" : overdue ? "Overdue" : "Pending"; return <div className="row" key={item.id}><span><b>{state}</b><small><Link href={`/customers/${item.customer_id}`}>{item.customers?.full_name ?? "Customer"}</Link> - {item.note || "No note"}</small><form action={updateFollowUpAction} className="compact-form"><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="customerId" value={item.customer_id}/><input type="hidden" name="returnTo" value="/follow-ups"/><label>Due date<input name="dueAt" type="datetime-local" defaultValue={item.due_at.slice(0,16)} disabled={item.status === "completed"}/></label><label>Note<input name="note" defaultValue={item.note || ""} disabled={item.status === "completed"}/></label>{item.status !== "completed" && <button>Save</button>}</form></span><time>{new Date(item.due_at).toLocaleString()}{item.status !== "completed" && <form action={completeFollowUpAction}><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="customerId" value={item.customer_id}/><button>Complete</button></form>}</time></div>})}</div> : <p className="empty-state">No follow-ups yet.</p>}</section></WorkspaceShell>;
}
