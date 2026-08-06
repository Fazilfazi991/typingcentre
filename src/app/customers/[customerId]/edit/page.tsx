import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerForm } from "@/app/customers/customer-form";
import { WorkspaceShell } from "@/components/workspace-shell";
import { updateCustomerAction } from "@/features/crm/actions";
import { isSafeUuid } from "@/features/crm/customer-utils";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function EditCustomer({
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
  const [{ data: customer }, { data: companies }, { data: branches }] = await Promise.all([
    context.supabase
      .from("customers")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", customerId)
      .is("archived_at", null)
      .maybeSingle(),
    context.supabase
      .from("companies")
      .select("id,name")
      .eq("organization_id", context.organization.id)
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("branches")
      .select("id,name,company_id")
      .eq("organization_id", context.organization.id)
      .is("archived_at", null)
      .order("name"),
  ]);

  if (!customer) notFound();

  return (
    <WorkspaceShell organizationName={context.organization.name}>
      <header className="page-heading">
        <Link href={`/customers/${customer.id}`}>Back to customer</Link>
        <h1>Edit customer</h1>
        {error && <p className="form-error">{decodeURIComponent(error)}</p>}
      </header>
      <CustomerForm
        action={updateCustomerAction}
        customer={customer}
        companies={companies ?? []}
        branches={branches ?? []}
        submitLabel="Save changes"
      />
    </WorkspaceShell>
  );
}
