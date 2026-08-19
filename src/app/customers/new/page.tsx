import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerForm } from "@/app/customers/customer-form";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createCustomerAction } from "@/features/crm/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function NewCustomer({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const { data: branches } = await context.supabase
      .from("branches")
      .select("id,name,company_id")
      .eq("organization_id", context.organization.id)
      .is("archived_at", null)
      .order("name");

  return (
    <WorkspaceShell organizationName={context.organization.name}>
      <header className="page-heading">
        <Link href="/customers">Back to customers</Link>
        <h1>Add customer</h1>
        {error && <p className="form-error">{decodeURIComponent(error)}</p>}
      </header>
      <CustomerForm
        action={createCustomerAction}
        branches={branches ?? []}
        submitLabel="Create customer"
      />
    </WorkspaceShell>
  );
}
