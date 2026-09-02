import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NoteItLogo } from "@/components/note-it-logo";
import { PublicSiteShell } from "@/components/public-site-shell";
import { resolveAuthDestination } from "@/lib/auth/destination";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your workspace | Note It", description: "Create a Note It account and typing-centre workspace.", alternates: { canonical: "https://www.noteitapp.com/signup" } };
export default async function SignupPage() { const supabase = await getSupabaseServerClient(); if (supabase) { const { data: { user } } = await supabase.auth.getUser(); if (user) { const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(); const { data: organization } = membership ? await supabase.from("organizations").select("slug").eq("id", membership.organization_id).maybeSingle() : { data: null }; if (organization?.slug !== "note-it-demo") redirect((await resolveAuthDestination()) as never); } } return <PublicSiteShell><main className="auth signup-page"><section className="auth-panel" aria-labelledby="signup-title"><div className="auth-brand"><NoteItLogo className="auth-logo"/></div><div className="auth-intro"><p>Create your workspace</p><h1 id="signup-title">Start organizing your typing centre</h1><span>Create an account first. Workspace setup takes about a minute.</span></div><SignupForm/></section></main></PublicSiteShell>; }
