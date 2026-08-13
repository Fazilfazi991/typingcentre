import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("WhatsApp tenant isolation", () => {
  it("keeps settings writes and scheduler counts pinned to the active tenant", async () => {
    const [action, scheduler] = await Promise.all([
      readFile(new URL("../src/features/settings/actions.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/lib/notifications/whatsapp-expiry.ts", import.meta.url), "utf8"),
    ]);
    expect(action).toContain('.eq("id", context.organization.id)');
    expect(action).not.toMatch(/formData\.get\(["']organization/i);
    expect(scheduler).toContain('.eq("organization_id", tenant.id)');
    expect(scheduler).toContain("sendWhatsAppTemplateMessage({");
    expect(scheduler).toContain("tenantId: tenant.id");
  });

  it("allows notification-log reads only through organization membership RLS", async () => {
    const migration = await readFile(
      new URL("../supabase/migrations/20260813050938_tenant_whatsapp_expiry_notifications.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("alter table public.whatsapp_notifications enable row level security");
    expect(migration).toContain("security.can_access_organization(organization_id)");
    expect(migration).toContain("revoke all on public.whatsapp_notifications from anon, authenticated");
    expect(migration).not.toContain("grant insert on public.whatsapp_notifications to authenticated");
  });
});
