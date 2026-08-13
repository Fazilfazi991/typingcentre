import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL("../supabase/migrations/20260813050938_tenant_whatsapp_expiry_notifications.sql", import.meta.url);

describe("tenant WhatsApp expiry migration", () => {
  it("defaults every tenant to disabled and validates E.164 recipients", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("whatsapp_notifications_enabled boolean not null default false");
    expect(sql).toContain("whatsapp_recipient_phone ~ '^\\+[1-9][0-9]{7,14}$'");
    expect(sql).not.toMatch(/whatsapp_access_token|service_role_key|webhook_verify_token/i);
  });

  it("enforces one summary per tenant and local date at database level", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("unique (organization_id, notification_type, summary_local_date)");
    expect(sql).toContain("total_count = expiring_today_count + next_7_days_count + next_30_days_count");
  });

  it("keeps history tenant-scoped and browser writes unavailable", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("alter table public.whatsapp_notifications enable row level security");
    expect(sql).toContain("security.can_access_organization(organization_id)");
    expect(sql).toContain("revoke all on public.whatsapp_notifications from anon, authenticated");
    expect(sql).toContain("grant select on public.whatsapp_notifications to authenticated");
    expect(sql).not.toContain("grant insert on public.whatsapp_notifications to authenticated");
  });

  it("protects status ordering and exposes the transition only to service_role", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("incoming_rank >= current_rank");
    expect(sql).toContain("current_record.status not in ('delivered', 'read')");
    expect(sql).toContain("grant execute on function public.record_whatsapp_delivery_status");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public, anon, authenticated");
  });
});
