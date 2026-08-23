import "server-only";
import { redirect } from "next/navigation";
import { getActivePlatformAdmin } from "@/lib/platform/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminContext = { userId: string; admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>> };

/** The only service-role entrypoint for the platform console. Never call this from tenant code. */
export async function requirePlatformAdmin(returnTo = "/admin"): Promise<AdminContext> {
  const user = await getActivePlatformAdmin();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}` as never);
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Platform administration is not configured.");
  return { userId: user.id, admin };
}

export async function writePlatformAudit(
  context: AdminContext,
  event: { action: string; targetType: string; targetId?: string | null; organizationId?: string | null; before?: unknown; after?: unknown },
) {
  const { error } = await context.admin.from("platform_admin_audit_events").insert({
    actor_user_id: context.userId, organization_id: event.organizationId ?? null, action: event.action,
    target_type: event.targetType, target_id: event.targetId ?? null,
    before_data: event.before ?? null, after_data: event.after ?? null,
  });
  if (error) throw error;
}

export function adminDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value)) : "—";
}
