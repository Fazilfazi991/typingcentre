"use server";

import { redirect } from "next/navigation";
import { getDemoCredentials } from "@/lib/demo/workspace";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function demoLoginAction(_: { error?: string } = {}, _formData?: FormData): Promise<{ error?: string }> {
  const credentials = getDemoCredentials();
  const supabase = await getSupabaseServerClient();
  if (!credentials || !supabase) return { error: "Demo is temporarily unavailable. Please try again." };
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return { error: "Demo is temporarily unavailable. Please try again." };
  redirect("/dashboard" as never);
}
