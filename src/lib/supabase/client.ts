import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/env.public";

/**
 * Stage 2 placeholder. It returns null in demo mode and must not replace the
 * LocalStorage demo adapter until authentication and RLS are implemented.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
