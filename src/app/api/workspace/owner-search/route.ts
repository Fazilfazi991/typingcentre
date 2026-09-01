import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { measureAsync } from "@/lib/performance/timing";

const limit = 25;
export async function GET(request: NextRequest) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ results: [] }, { status: 401 });
  const kind = request.nextUrl.searchParams.get("kind");
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if ((kind !== "customer" && kind !== "company") || (query.length > 0 && query.length < 2)) return NextResponse.json({ results: [] });
  const { data, error } = await measureAsync("owner_search", () => context.supabase.rpc("owner_search", {
    target_organization_id: context.organization.id,
    owner_kind: kind,
    search_text: query,
    result_limit: limit,
  }));
  if (error) return NextResponse.json({ results: [] }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}
