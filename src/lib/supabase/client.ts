"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfiguration, publicEnv, supabasePublicKey } from "@/lib/config/env.public";

/**
 * Stage 2 placeholder. It returns null in demo mode and must not replace the
 * LocalStorage demo adapter until authentication and RLS are implemented.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!hasSupabaseConfiguration || !supabasePublicKey) return null;
  return createBrowserClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, supabasePublicKey);
}
