import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/validation";
import { publicEnv, supabasePublicKey } from "@/lib/config/env.public";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeNext(request.nextUrl.searchParams.get("next") ?? undefined) ?? "/dashboard";

  if (!code || !publicEnv.NEXT_PUBLIC_SUPABASE_URL || !supabasePublicKey) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, supabasePublicKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? NextResponse.redirect(new URL("/auth/error", request.url)) : response;
}
