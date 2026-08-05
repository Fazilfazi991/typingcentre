import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import "server-only";
import { hasSupabaseConfiguration, publicEnv, supabasePublicKey } from "@/lib/config/env.public";

/** Stage 2 placeholder only. Never add a service-role key to this client. */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!hasSupabaseConfiguration || !supabasePublicKey) return null;
  const cookieStore = await cookies();
  return createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, supabasePublicKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot persist refreshed cookies. */ } } } });
}
