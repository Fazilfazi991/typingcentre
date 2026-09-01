import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionMenu } from "@/components/action-menu";
import { ArchiveDialog } from "@/components/archive-dialog";
import { WorkspaceShell } from "@/components/workspace-shell";
import { archiveCustomerAction } from "@/features/crm/actions";
import { customerDetailPath, customerEditPath } from "@/features/crm/customer-utils";
import { formatDisplayDate, getRelativeExpiryText } from "@/lib/dates/expiry";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { measureAsync } from "@/lib/performance/timing";
import { listParams } from "@/lib/workspace/utils";

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  full_name: string;
  customer_type: string;
  nationality: string | null;
  phone: string;
  passport_number: string | null;
  emirates_id_number: string | null;
  companies: { name: string } | { name: string }[] | null;
  branches: { name: string } | { name: string }[] | null;
  document_count: number;
  next_expiry_date: string | null;
  next_document_type: string | null;
};

function relationName(value: { name: string } | { name: string }[] | null) {
  return Array.isArray(value) ? (value[0]?.name ?? "") : (value?.name ?? "");
}

function CustomerActions({ customer }: { customer: CustomerRow }) {
  return (
    <div className="actions">
      <Link href={customerDetailPath(customer.id)}>View</Link>
      <ActionMenu label={`More actions for ${customer.full_name}`}>
        <Link href={customerEditPath(customer.id)}>Edit</Link>
        <ArchiveDialog
          action={archiveCustomerAction}
          fields={{ customerId: customer.id }}
          entityName={customer.full_name}
          title="Archive customer?"
          description="This removes the customer from active lists. Existing follow-ups, document history and activity records will remain retained."
          confirmLabel="Archive Customer"
        />
      </ActionMenu>
    </div>
  );
}

export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);

  const params = listParams(await searchParams, ["updated_at", "full_name"]);
  const { data: summary, error } = await measureAsync("customer_list_query", () => context.supabase.rpc("customer_list_summary", {
    target_organization_id: context.organization.id,
    search_text: params.search,
    sort_column: params.sort,
    sort_ascending: params.direction === "asc",
    page_offset: (params.page - 1) * params.pageSize,
    page_limit: params.pageSize,
  }));
  if (error) throw error;
  const customers = ((summary as any)?.rows ?? []) as CustomerRow[];
  const count = Number((summary as any)?.count ?? 0);

  return (
    <WorkspaceShell organizationName={context.organization.name}>
      <header className="page-heading split">
        <div>
          <p className="eyebrow">Customers</p>
          <h1>Customers</h1>
          <p>Personal records protected by tenant RLS.</p>
        </div>
        <Link className="primary-button" href="/customers/new">
          Add customer
        </Link>
      </header>
      <form className="filter-bar">
        <label>
          Search customers
          <input name="search" defaultValue={params.search} placeholder="Search name, mobile or ID" />
        </label>
        <button>Search</button>
      </form>
      <section className="panel table-panel">
        {customers.length ? (
          <>
            <table className="desktop-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Mobile</th>
                  <th>Documents</th>
                  <th>Next expiry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>{(() => { const documents = Number(customer.document_count ?? 0); const next = customer.next_expiry_date; const type = customer.next_document_type ?? ""; return <>
                    <td>
                      <Link href={customerDetailPath(customer.id)}>
                        <b>{customer.full_name}</b>
                      </Link>
                      <small>
                        {customer.customer_type} - {customer.nationality || "Nationality not recorded"}
                      </small>
                    </td>
                    <td>
                      {relationName(customer.companies) || "Independent"}
                      <small>{relationName(customer.branches)}</small>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{documents ? `${documents} document${documents === 1 ? "" : "s"}` : "No documents"}</td>
                    <td>{next ? <><b>{type || "Document"}</b><small>{formatDisplayDate(next)} · {getRelativeExpiryText(next)}</small></> : "No expiry recorded"}</td>
                    <td>
                      <CustomerActions customer={customer} />
                    </td>
                  </>; })()}</tr>
                ))}
              </tbody>
            </table>
            <div className="mobile-card-list">
                {customers.map((customer) => (
                <article className="mobile-record-card" key={customer.id}>{(() => { const documents = Number(customer.document_count ?? 0); const next = customer.next_expiry_date; const type = customer.next_document_type ?? ""; return <>
                  <div>
                    <Link href={customerDetailPath(customer.id)}>
                      <b>{customer.full_name}</b>
                    </Link>
                    <small>
                      {customer.customer_type} - {relationName(customer.companies) || "Independent"}
                    </small>
                  </div>
                  <dl>
                    <div>
                      <dt>Documents</dt>
                      <dd>{documents ? `${documents} document${documents === 1 ? "" : "s"}` : "No documents yet"}</dd>
                    </div>
                    <div>
                      <dt>Next expiry</dt>
                      <dd className="customer-expiry-mobile">{next ? <><b>{type || "Document"}</b><small>{getRelativeExpiryText(next)}</small></> : "No expiry recorded"}</dd>
                    </div>
                  </dl>
                  <CustomerActions customer={customer} />
                </>; })()}</article>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">No customers match this workspace.</div>
        )}
      </section>
      <p className="pagination">{count ?? 0} customer records</p>
    </WorkspaceShell>
  );
}
