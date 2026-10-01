import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArchiveDialog } from "@/components/archive-dialog";
import { WorkspaceShell } from "@/components/workspace-shell";
import { archiveBranchAction, archiveCompanyAction } from "@/features/crm/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { money, statusLabels, type RequestStatus } from "@/lib/service-requests/workflow";
import "../../service-requests/service-requests.css";

export const dynamic = "force-dynamic";

export default async function CompanyDetail({ params }: { params: Promise<{ companyId: string }> }) {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/account-inactive" as never);
  }

  const { companyId } = await params;
  const [{ data: company }, { data: branches }, { data: serviceRequests }] = await Promise.all([
    context.supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    context.supabase
      .from("branches")
      .select("id,name,code,city,contact_name,phone,updated_at")
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("name"),
    context.supabase.from("service_requests").select("id,request_number,status,total_amount,paid_amount,customer_id,customers(full_name),services(name)")
      .eq("organization_id",context.organization.id).eq("company_id",companyId).is("archived_at",null).order("created_at",{ascending:false}).limit(30),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <WorkspaceShell organizationName={context.organization.name}>
      <header className="page-heading split">
        <div>
          <Link href="/companies">Back to companies</Link>
          <h1>{company.name}</h1>
          <p>
            {company.archived_at ? "Archived" : "Active"} - {company.city}
          </p>
        </div>
        {!company.archived_at && (
          <div className="actions">
            <Link className="primary-button" href={`/companies/${company.id}/edit`}>
              Edit company
            </Link>
            <Link className="primary-button" href={`/documents/upload?companyId=${company.id}`}>
              Add document
            </Link>
            <ArchiveDialog
              action={archiveCompanyAction}
              fields={{ companyId: company.id }}
              entityName={company.name}
              title="Archive company?"
              description="This removes the company from active lists. Existing branches, customers and historical records remain retained."
              confirmLabel="Archive Company"
            />
          </div>
        )}
      </header>
      <section className="panel service-card"><div className="service-card-top"><h2>Service requests</h2><Link className="primary-button" href={`/service-requests/new?companyId=${company.id}`}>New request</Link></div>
        {(serviceRequests ?? []).length ? <ul className="service-checklist">{serviceRequests!.map(item => <li key={item.id}><span><Link href={`/service-requests/${item.id}`}><b>{item.request_number}</b> · {(Array.isArray(item.services) ? item.services[0] : item.services)?.name}</Link><small>{(Array.isArray(item.customers) ? item.customers[0] : item.customers)?.full_name} · {money(item.total_amount)}</small></span><span className={`service-status status-${item.status}`}>{statusLabels[item.status as RequestStatus]}</span></li>)}</ul> : <p className="empty-state">No service requests for this company.</p>}
      </section>
      <section className="detail-grid">
        <article className="panel">
          <h2>Documents and renewals</h2>
          <p className="empty-state">Upload a scanned document and review AI-extracted data before it is saved.</p>
          <Link className="text-link" href={`/documents/upload?companyId=${company.id}`}>Upload &amp; Auto Fill</Link>
        </article>
        <article className="panel">
          <h2>Overview</h2>
          <dl>
            <div>
              <dt>Trade licence</dt>
              <dd>{company.licence_number || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Trade name</dt>
              <dd>{company.trade_name || "-"}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {company.contact_name || "-"}
                <br />
                {company.contact_phone || ""}
              </dd>
            </div>
          </dl>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <h2>Branches</h2>
            {!company.archived_at && (
              <Link className="text-link" href={`/companies/${company.id}/branches/new`}>
                Add branch
              </Link>
            )}
          </div>
          {branches?.length ? (
            <div className="stack">
              {branches.map((branch) => (
                <div className="row" key={branch.id}>
                  <span>
                    <b>{branch.name}</b>
                    <small>
                      {branch.code || branch.city} - {branch.contact_name || branch.phone || "No contact"}
                    </small>
                  </span>
                  {!company.archived_at && (
                    <span className="actions">
                      <Link href={`/companies/${company.id}/branches/${branch.id}/edit`}>Edit</Link>
                      <ArchiveDialog
                        action={archiveBranchAction}
                        fields={{ companyId: company.id, branchId: branch.id }}
                        entityName={branch.name}
                        title="Archive branch?"
                        description="This removes the branch from active lists. Existing linked customer and historical records remain retained."
                        confirmLabel="Archive Branch"
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No active branches.</p>
          )}
        </article>
      </section>
    </WorkspaceShell>
  );
}
