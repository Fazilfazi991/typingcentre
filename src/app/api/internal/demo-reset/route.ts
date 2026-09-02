import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config/env.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteDocumentObject } from "@/lib/r2/objects";

export const runtime = "nodejs";
const DEMO_SLUG = "note-it-demo";

function log(event: string, details: Record<string, unknown> = {}) {
  process.stdout.write(`${JSON.stringify({ event, ...details })}\n`);
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!['production', 'preview'].includes(process.env.VERCEL_ENV ?? '') || env.DEMO_ORGANIZATION_SLUG !== DEMO_SLUG) {
    log("demo_reset_rejected", { reason: "environment_guard" });
    return NextResponse.json({ error: "Demo reset guard rejected this environment." }, { status: 409 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 503 });
  try {
    const { data: organization } = await admin.from("organizations").select("id,slug,status,is_active").eq("slug", DEMO_SLUG).eq("status", "active").eq("is_active", true).maybeSingle();
    if (!organization) throw new Error("organization_guard");
    if (env.DEMO_ORGANIZATION_ID && organization.id !== env.DEMO_ORGANIZATION_ID) throw new Error("organization_identity_guard");
    const { count: ownerCount } = await admin.from("organization_memberships").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("is_primary_owner", true).eq("status", "active");
    if (ownerCount !== 1) throw new Error("owner_guard");
    const [{ data: versions }, { data: pages }, { data: scans }] = await Promise.all([
      admin.from("document_versions").select("object_key").eq("organization_id", organization.id),
      admin.from("document_version_files").select("object_key").eq("organization_id", organization.id),
      admin.from("pending_scans").select("object_key").eq("organization_id", organization.id).not("object_key", "is", null),
    ]);
    const prefix = `organizations/${organization.id}/`;
    const candidates = [...(versions ?? []), ...(pages ?? []), ...(scans ?? [])].map((row) => row.object_key).filter((key): key is string => typeof key === "string");
    const safeKeys = [...new Set(candidates.filter((key) => key.startsWith(prefix)))];
    const skippedKeys = candidates.length - safeKeys.length;
    log("demo_reset_started", { organization_id: organization.id, storage_objects: safeKeys.length, skipped_objects: skippedKeys });
    const { data, error } = await (admin as any).rpc("reset_note_it_demo_workspace");
    if (error) throw error;
    const storageResults = await Promise.allSettled(safeKeys.map((key) => deleteDocumentObject(key)));
    const storageFailures = storageResults.filter((result) => result.status === "rejected").length;
    log("demo_reset_completed", { organization_id: organization.id, counts: data, storage_deleted: safeKeys.length - storageFailures, storage_failures: storageFailures, skipped_objects: skippedKeys });
    return NextResponse.json({ ok: true, counts: data, storage: { deleted: safeKeys.length - storageFailures, failed: storageFailures, skipped: skippedKeys } });
  } catch (error) {
    log("demo_reset_failed", { reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return NextResponse.json({ error: "Demo reset failed. The next scheduled run will retry safely." }, { status: 500 });
  }
}
