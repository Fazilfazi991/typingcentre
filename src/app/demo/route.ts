import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDemoCredentials } from "@/lib/demo/workspace";
import { hasSupabaseConfiguration, publicEnv, supabasePublicKey } from "@/lib/config/env.public";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfiguration || !supabasePublicKey) {
    return redirect(request, "/login?demo=unavailable");
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

  // Never replace an existing customer's session with the shared demo identity.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return response;

  const credentials = getDemoCredentials();
  if (!credentials) return redirect(request, "/login?demo=unavailable");

  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return redirect(request, "/login?demo=unavailable");

  return response;
}
