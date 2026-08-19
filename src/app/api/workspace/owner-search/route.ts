import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";

const limit = 25;
export async function GET(request: NextRequest) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ results: [] }, { status: 401 });
  const kind = request.nextUrl.searchParams.get("kind");
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if ((kind !== "customer" && kind !== "company") || query.length < 2) return NextResponse.json({ results: [] });
  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  if (kind === "company") {
    const { data } = await context.supabase.from("companies").select("id,name,trade_name,contact_phone,contact_email,licence_number").eq("organization_id", context.organization.id).is("archived_at", null).or(`name.ilike.${pattern},trade_name.ilike.${pattern},contact_phone.ilike.${pattern},contact_email.ilike.${pattern},licence_number.ilike.${pattern}`).order("name").limit(limit);
    return NextResponse.json({ results: (data ?? []).map((item) => ({ id: item.id, label: item.name, description: item.trade_name || item.licence_number || item.contact_phone })) });
  }
  const [customers, matchingCompanies] = await Promise.all([
    context.supabase.from("customers").select("id,full_name,phone,email,companies(name)").eq("organization_id", context.organization.id).is("archived_at", null).or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`).order("full_name").limit(limit),
    context.supabase.from("companies").select("id").eq("organization_id", context.organization.id).is("archived_at", null).ilike("name", pattern).limit(limit),
  ]);
  const companyIds = (matchingCompanies.data ?? []).map((item) => item.id);
  const companyCustomers = companyIds.length ? await context.supabase.from("customers").select("id,full_name,phone,email,companies(name)").eq("organization_id", context.organization.id).is("archived_at", null).in("company_id", companyIds).order("full_name").limit(limit) : { data: [] as any[] };
  const unique = new Map<string, any>(); for (const item of [...(customers.data ?? []), ...(companyCustomers.data ?? [])]) unique.set(item.id, item);
  return NextResponse.json({ results: [...unique.values()].slice(0, limit).map((item) => { const company = Array.isArray(item.companies) ? item.companies[0] : item.companies; return { id: item.id, label: item.full_name, description: company?.name || item.phone || item.email || null }; }) });
}
