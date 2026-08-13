import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatDisplayDate } from "@/lib/dates/expiry";
import { oneRelation } from "@/lib/renewals/records";
import { normalizeSearchTerm, postgrestSearchPattern } from "@/lib/search/query";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const term = normalizeSearchTerm((await searchParams).search);
  const context = await getWorkspaceContext(term ? `/search?search=${encodeURIComponent(term)}` : "/search");
  if (!context) redirect("/account-inactive" as never);
  let customers: any[] = [], companies: any[] = [], documents: any[] = [];
  if (term.length >= 2) {
    const pattern = postgrestSearchPattern(term);
    const [customerResult, companyResult, documentResult] = await Promise.all([
      context.supabase.from("customers").select("id,full_name,phone,whatsapp_number,passport_number,emirates_id_number,companies(name)").eq("organization_id", context.organization.id).is("archived_at", null).or(`full_name.ilike.${pattern},phone.ilike.${pattern},whatsapp_number.ilike.${pattern},passport_number.ilike.${pattern},emirates_id_number.ilike.${pattern}`).limit(20),
      context.supabase.from("companies").select("id,name,trade_name,licence_number,establishment_card_number,immigration_file_number,contact_phone").eq("organization_id", context.organization.id).is("archived_at", null).or(`name.ilike.${pattern},trade_name.ilike.${pattern},licence_number.ilike.${pattern},establishment_card_number.ilike.${pattern},immigration_file_number.ilike.${pattern},contact_phone.ilike.${pattern}`).limit(20),
      context.supabase.from("documents").select("id,display_name,document_number,expires_on,customers(full_name),companies(name),organization_document_types(name)").eq("organization_id", context.organization.id).is("archived_at", null).or(`display_name.ilike.${pattern},document_number.ilike.${pattern}`).limit(20),
    ]);
    customers = customerResult.data ?? [];
    companies = companyResult.data ?? [];
    documents = documentResult.data ?? [];
  }
  const total = customers.length + companies.length + documents.length;
  return <WorkspaceShell organizationName={context.organization.name}>
    <header className="page-heading"><p className="eyebrow">Global search</p><h1>Search Note It</h1><p>Find tenant-scoped customers, companies, and documents.</p></header>
    <form className="search-page-form" role="search"><label htmlFor="workspace-search">Search name, mobile, ID, licence, or document number</label><div><input id="workspace-search" name="search" defaultValue={term} autoFocus placeholder="Try a customer name or document number"/><button className="primary-button" type="submit">Search</button></div></form>
    {term.length < 2 ? <p className="empty-state">Enter at least two characters to search this workspace.</p> : total === 0 ? <p className="empty-state">No accessible records match “{term}”.</p> : <div className="search-results">
      <section className="panel"><div className="panel-heading"><div><h2>Customers</h2><p>{customers.length} result{customers.length === 1 ? "" : "s"}</p></div></div>{customers.length ? <div className="search-result-list">{customers.map((customer) => { const company = oneRelation<any>(customer.companies); return <Link href={`/customers/${customer.id}`} key={customer.id}><span><b>{customer.full_name}</b><small>{company?.name || "Individual customer"}</small></span><span><small>{customer.phone || customer.whatsapp_number || "No mobile"}</small><em>{customer.emirates_id_number || customer.passport_number || "No ID recorded"}</em></span></Link>; })}</div> : <p className="empty-state compact">No customer matches.</p>}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Companies</h2><p>{companies.length} result{companies.length === 1 ? "" : "s"}</p></div></div>{companies.length ? <div className="search-result-list">{companies.map((company) => <Link href={`/companies/${company.id}`} key={company.id}><span><b>{company.name}</b><small>{company.trade_name || "Company"}</small></span><span><small>{company.contact_phone || "No mobile"}</small><em>{company.licence_number || company.establishment_card_number || "No licence recorded"}</em></span></Link>)}</div> : <p className="empty-state compact">No company matches.</p>}</section>
      <section className="panel search-documents-panel"><div className="panel-heading"><div><h2>Documents</h2><p>{documents.length} result{documents.length === 1 ? "" : "s"}</p></div></div>{documents.length ? <div className="search-result-list">{documents.map((document) => { const customer = oneRelation<any>(document.customers); const company = oneRelation<any>(document.companies); const type = oneRelation<any>(document.organization_document_types); return <Link href={`/documents/${document.id}`} key={document.id}><span><b>{type?.name || document.display_name || "Document"}</b><small>{customer?.full_name || company?.name || "Document record"}</small></span><span><small>{document.document_number || "No number"}</small><em>Expires {formatDisplayDate(document.expires_on)}</em></span></Link>; })}</div> : <p className="empty-state compact">No document matches.</p>}</section>
    </div>}
  </WorkspaceShell>;
}
