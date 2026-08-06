import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArchiveDialog } from "@/components/archive-dialog";
import { WorkspaceShell } from "@/components/workspace-shell";
import { archiveCustomerAction, createFollowUpAction } from "@/features/crm/actions";
import { customerCanMutate, customerEditPath, isSafeUuid } from "@/features/crm/customer-utils";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);

  const { customerId } = await params;
  if (!isSafeUuid(customerId)) notFound();

  const queryParams = await searchParams;
  const error = typeof queryParams.error === "string" ? queryParams.error : "";
  const [{ data: customer }, { data: followUps }, { data: activity }] = await Promise.all([
    context.supabase
      .from("customers")
      .select("*,companies(name),branches(name)")
      .eq("organization_id", context.organization.id)
      .eq("id", customerId)
      .maybeSingle(),
    context.supabase.from("follow_ups").select("id,due_at,status,note").eq("customer_id", customerId).order("due_at").limit(6),
    context.supabase.from("activity_logs").select("id,message,created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  if (!customer) notFound();

  const canMutate = customerCanMutate(customer);

  return (
    <WorkspaceShell organizationName={context.organization.name}>
      <header className="page-heading split">
        <div>
          <Link href="/customers">Back to customers</Link>
          <h1>{customer.full_name}</h1>
          <p>
            {customer.customer_type} - {customer.nationality || "Nationality not recorded"}{" "}
            {customer.archived_at && <span className="status-badge">Archived</span>}
          </p>
          {error && <p className="form-error">{decodeURIComponent(error)}</p>}
        </div>
        {canMutate && (
          <div className="actions">
            <Link className="primary-button" href={customerEditPath(customer.id)}>
              Edit customer
            </Link>
            <ArchiveDialog
              action={archiveCustomerAction}
              fields={{ customerId: customer.id }}
              entityName={customer.full_name}
              title="Archive customer?"
              description="This removes the customer from active lists. Existing follow-ups, document history and activity records will remain retained."
              confirmLabel="Archive Customer"
            />
          </div>
        )}
      </header>
      <section className="detail-grid">
        <article className="panel">
          <h2>Identity and contact</h2>
          <dl>
            <div>
              <dt>Mobile</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{customer.whatsapp_number || "-"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{customer.email || "-"}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{customer.date_of_birth || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Passport</dt>
              <dd>{customer.passport_number || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Emirates ID</dt>
              <dd>{customer.emirates_id_number || "Not recorded"}</dd>
            </div>
          </dl>
        </article>
        <article className="panel">
          <h2>Company relationship</h2>
          <p>
            <b>{customer.companies?.name || "Independent customer"}</b>
            <br />
            {customer.branches?.name || "No branch"}
          </p>
          <p>{customer.profession || "Profession not recorded"}</p>
          <p>{customer.residential_address || "Address not recorded"}</p>
        </article>
        <article className="panel">
          <h2>Follow-ups</h2>
          {followUps?.length ? (
            <div className="stack">
              {followUps.map((item) => (
                <div className="row" key={item.id}>
                  <span>
                    <b>{item.status}</b>
                    <small>{item.note || "No note"}</small>
                  </span>
                  <time>{new Date(item.due_at).toLocaleString()}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No follow-ups yet.</p>
          )}
          {canMutate && (
            <form action={createFollowUpAction} className="compact-form">
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="returnTo" value={`/customers/${customer.id}`} />
              <label>
                Due date
                <input name="dueAt" type="datetime-local" required />
              </label>
              <label>
                Note
                <input name="note" placeholder="Follow-up note" />
              </label>
              <button>Add follow-up</button>
            </form>
          )}
        </article>
        <article className="panel">
          <h2>Activity</h2>
          {activity?.length ? (
            <div className="stack">
              {activity.map((item) => (
                <div className="row" key={item.id}>
                  <b>{item.message}</b>
                  <time>{new Date(item.created_at).toLocaleDateString()}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No activity yet.</p>
          )}
        </article>
        <article className="panel">
          <h2>Documents and renewals</h2>
          <p className="empty-state">Metadata and private files arrive in Stage 6.</p>
        </article>
      </section>
    </WorkspaceShell>
  );
}
