import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";
export const metadata: Metadata = { title: "Create your workspace | Note It", description: "Note It workspace creation is coming next.", alternates: { canonical: "https://www.noteitapp.com/signup" } };
export default function SignupPage() { return <PublicSiteShell><main className="public-state-page"><p className="landing-eyebrow">Workspace creation</p><h1>Account creation is the next product step.</h1><p>Self-service signup is not open yet. You can explore the complete document and renewal workflow in the shared demo today.</p><div className="landing-actions"><Link className="landing-button primary" href="/demo">Open Demo</Link><Link className="landing-button secondary" href="/login">Login</Link></div></main></PublicSiteShell>; }
