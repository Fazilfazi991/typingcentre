import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "server-only";
import { publicEnv } from "@/lib/config/env.public";

/** Stage 2 placeholder only. Never add a service-role key to this client. */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
