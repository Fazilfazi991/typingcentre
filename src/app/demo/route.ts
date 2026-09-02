import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDemoCredentials, isDemoOrganizationSlug } from "@/lib/demo/workspace";
import { hasSupabaseConfiguration, publicEnv, supabasePublicKey } from "@/lib/config/env.public";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfiguration || !supabasePublicKey) {
    return redirect(request, "/demo/unavailable");
  }

  let response = redirect(request, "/dashboard");
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, supabasePublicKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = redirect(request, "/dashboard");
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: membership } = await supabase.from("organization_memberships").select("organizations(slug)").eq("user_id", user.id).eq("status", "active").order("is_primary_owner", { ascending: false }).limit(1).maybeSingle();
    const organization = Array.isArray(membership?.organizations) ? membership.organizations[0] : membership?.organizations;
    return isDemoOrganizationSlug(organization?.slug) ? response : redirect(request, "/demo/switch");
  }

  const credentials = getDemoCredentials();
  if (!credentials) return redirect(request, "/demo/unavailable");

  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    process.stderr.write(`${JSON.stringify({ event: "demo_entry_failed", reason: "authentication_failed" })}\n`);
    return redirect(request, "/demo/unavailable");
  }

  return response;
}
