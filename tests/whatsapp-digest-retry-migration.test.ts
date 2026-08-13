import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../supabase/migrations/20260813174206_whatsapp_digest_cumulative_retries.sql",
  import.meta.url,
);

describe("WhatsApp cumulative digest retry migration", () => {
  it("stores cumulative counts consistent with the dashboard", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("expiring_today_count <= next_7_days_count");
    expect(sql).toContain("next_7_days_count <= next_30_days_count");
    expect(sql).toContain("total_count = next_30_days_count");
  });

  it("implements a bounded service-only retry claim", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("retry_count between 0 and 2");
    expect(sql).toContain("current_record.next_retry_at <= timezone('utc', now())");
    expect(sql).toContain("grant execute on function public.claim_whatsapp_expiry_notification");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public, anon, authenticated");
  });
});
