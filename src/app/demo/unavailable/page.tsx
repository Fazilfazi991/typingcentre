import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";

export default function DemoUnavailablePage() {
  return <PublicSiteShell><main className="public-state-page"><p className="landing-eyebrow">Demo temporarily unavailable</p><h1>We couldn’t open the shared workspace.</h1><p>Please try again shortly. Your own workspace and sign-in are unaffected.</p><div className="landing-actions"><Link className="landing-button primary" href="/">Back to Home</Link><Link className="landing-button secondary" href="/login">Login</Link></div></main></PublicSiteShell>;
}
