import { redirect } from "next/navigation";
import { NoteItLogo } from "@/components/note-it-logo";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { SetupForm } from "./setup-form";
export default async function SetupPage() { const context = await getWorkspaceContext("/onboarding/setup"); if (!context) redirect("/login" as never); if (context.organization.onboarding_completed_at) redirect("/dashboard" as never); return <main className="auth onboarding-page"><section className="auth-panel onboarding-panel"><div className="auth-brand"><NoteItLogo className="auth-logo"/></div><SetupForm organization={{ name: context.organization.name, location: context.organization.location, email: context.organization.business_email ?? context.user.email ?? "", phone: context.organization.phone ?? "", address: context.organization.address ?? "", step: context.organization.onboarding_step }}/></section></main>; }
