import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";
import { switchToDemoAction } from "../actions";

export default function DemoSwitchPage() {
  return <PublicSiteShell><main className="public-state-page"><p className="landing-eyebrow">Demo Mode</p><h1>You’re currently signed in to your workspace.</h1><p>Opening the shared demo will sign this browser out of your workspace first.</p><div className="landing-actions"><Link className="landing-button secondary" href="/dashboard">Continue to My Dashboard</Link><form action={switchToDemoAction}><button className="landing-button primary" type="submit">Open Demo</button></form></div></main></PublicSiteShell>;
}
