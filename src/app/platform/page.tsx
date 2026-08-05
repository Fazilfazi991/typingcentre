import { redirect } from "next/navigation"; import { resolveAuthDestination } from "@/lib/auth/destination";
export const dynamic = "force-dynamic";
export default async function Platform() { if (await resolveAuthDestination() !== "/platform") redirect("/access-denied" as never); return <main className="workspace"><h1>Platform</h1><p>Platform administration is connected. Tenant impersonation is not available.</p></main>; }
