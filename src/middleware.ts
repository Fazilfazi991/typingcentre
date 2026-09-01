import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfiguration, publicEnv, supabasePublicKey } from "@/lib/config/env.public";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseConfiguration || !supabasePublicKey) return response;

  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, supabasePublicKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes an existing session without adding authorization decisions here.
  // Verifies the signed JWT locally when asymmetric keys are available and
  // safely refreshes through the auth server for legacy symmetric projects.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|login|forgot-password|reset-password|auth/callback|auth/error|demo|privacy-policy|terms|data-deletion|api/webhooks|api/internal).*)",
  ],
};
