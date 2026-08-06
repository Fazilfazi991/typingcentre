import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionMenu } from "@/components/action-menu";
import { ArchiveDialog } from "@/components/archive-dialog";
import { WorkspaceShell } from "@/components/workspace-shell";
import { archiveCustomerAction } from "@/features/crm/actions";
import { customerDetailPath, customerEditPath } from "@/features/crm/customer-utils";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { listParams, maskEmiratesId, maskPassport } from "@/lib/workspace/utils";

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
  let query = context.supabase
    .from("customers")
    .select(
      "id,full_name,customer_type,nationality,phone,passport_number,emirates_id_number,updated_at,companies(name),branches(name)",
      { count: "exact" },
    )
    .eq("organization_id", context.organization.id)
    .is("archived_at", null)
    .order(params.sort, { ascending: params.direction === "asc" });

  if (params.search.length >= 2) {
    query = query.or(
      `full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,passport_number.ilike.%${params.search}%,emirates_id_number.ilike.%${params.search}%`,
    );
  }

  const { data, count } = await query.range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1);
  const customers = (data ?? []) as CustomerRow[];

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
                  <th>Passport</th>
                  <th>Emirates ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
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
                    <td>{maskPassport(customer.passport_number)}</td>
                    <td>{maskEmiratesId(customer.emirates_id_number)}</td>
                    <td>
                      <CustomerActions customer={customer} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mobile-card-list">
              {customers.map((customer) => (
                <article className="mobile-record-card" key={customer.id}>
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
                      <dt>Passport</dt>
                      <dd>{maskPassport(customer.passport_number)}</dd>
                    </div>
                    <div>
                      <dt>Emirates ID</dt>
                      <dd>{maskEmiratesId(customer.emirates_id_number)}</dd>
                    </div>
                  </dl>
                  <CustomerActions customer={customer} />
                </article>
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
