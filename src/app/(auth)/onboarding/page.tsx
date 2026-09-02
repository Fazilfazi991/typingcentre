import { redirect } from "next/navigation";
import { NoteItLogo } from "@/components/note-it-logo";
import { resolveAuthDestination } from "@/lib/auth/destination";
import { WorkspaceForm } from "./workspace-form";
export const dynamic = "force-dynamic";
export default async function OnboardingPage() { const destination = await resolveAuthDestination(); if (destination !== "/onboarding") redirect(destination as never); return <main className="auth onboarding-page"><section className="auth-panel onboarding-panel" aria-labelledby="workspace-title"><div className="auth-brand"><NoteItLogo className="auth-logo"/></div><ol className="onboarding-progress" aria-label="Onboarding progress"><li className="active">Workspace</li><li>Business details</li><li>Ready</li></ol><div className="auth-intro"><p>Step 1 of 3</p><h1 id="workspace-title">Create your typing-centre workspace</h1><span>We only need the essentials. You can add operational details later.</span></div><WorkspaceForm/></section></main>; }
