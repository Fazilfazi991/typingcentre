import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveDialog } from "@/components/archive-dialog";
import { archiveCompanyAction } from "@/features/crm/actions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { listParams } from "@/lib/workspace/utils";
import styles from "./companies.module.css";

export const dynamic = "force-dynamic";

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.25 4.25" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;
}

export default async function Companies({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);

  const params = listParams(await searchParams, ["updated_at", "name", "city"]);
  let query = context.supabase
    .from("companies")
    .select("id,name,trade_name,licence_number,city,updated_at", { count: "exact" })
    .eq("organization_id", context.organization.id)
    .is("archived_at", null)
    .order(params.sort, { ascending: params.direction === "asc" });

  if (params.search.length >= 2) query = query.ilike("name", `%${params.search}%`);
  const { data, count } = await query.range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1);

  return (
    <WorkspaceShell organizationName={context.organization.name}>
      <div className={styles.companiesPage}>
        <header className={styles.heading}>
          <div>
            <p className="eyebrow">Companies</p>
            <h1>Companies</h1>
          </div>
          <Link className={styles.addCompany} href="/companies/new"><PlusIcon />Add company</Link>
        </header>

        <form className={styles.toolbar}>
          <label className={styles.searchField}>
            <span className="sr-only">Search companies</span>
            <SearchIcon />
            <input name="search" defaultValue={params.search} placeholder="Search companies..." />
          </label>
          <label className={styles.sortField}>
            <span className="sr-only">Sort companies</span>
            <select name="sort" defaultValue={params.sort}>
              <option value="updated_at">Recently updated</option>
              <option value="name">Name</option>
              <option value="city">Emirate</option>
            </select>
          </label>
          <button className={styles.applyButton}>Apply</button>
        </form>

        <section className={`panel ${styles.tablePanel}`}>
          {data?.length ? (<>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>Company</th><th>Licence</th><th>Emirate</th><th>Actions</th></tr></thead>
                <tbody>{data.map((company: any) => (
                  <tr key={company.id}>
                    <td><Link className={styles.companyName} href={`/companies/${company.id}`}>{company.name}</Link><small>{company.trade_name || "No trade name recorded"}</small></td>
                    <td>{company.licence_number || "-"}</td>
                    <td>{company.city}</td>
                    <td><div className={styles.actions}>
                      <Link href={`/companies/${company.id}`}>View</Link>
                      <Link href={`/companies/${company.id}/edit`}>Edit</Link>
                      <ArchiveDialog action={archiveCompanyAction} fields={{ companyId: company.id }} entityName={company.name} title="Archive company?" description="This removes the company from active lists. Existing branches, customers and historical records remain retained." confirmLabel="Archive Company" />
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className={styles.mobileList}>{data.map((company: any) => <article key={company.id}><div><Link href={`/companies/${company.id}`}>{company.name}</Link><small>{company.trade_name || "No trade name recorded"}</small></div><dl><div><dt>Licence</dt><dd>{company.licence_number || "Not recorded"}</dd></div><div><dt>Emirate</dt><dd>{company.city}</dd></div></dl><div className={styles.mobileActions}><Link href={`/companies/${company.id}`}>View</Link><Link href={`/companies/${company.id}/edit`}>Edit</Link><ArchiveDialog action={archiveCompanyAction} fields={{ companyId: company.id }} entityName={company.name} title="Archive company?" description="This removes the company from active lists. Existing branches, customers and historical records remain retained." confirmLabel="Archive Company" /></div></article>)}</div></>
          ) : <div className="empty-state">No companies match this workspace.</div>}
        </section>
        <p className={styles.pagination}>{count ?? 0} company records</p>
      </div>
    </WorkspaceShell>
  );
}
