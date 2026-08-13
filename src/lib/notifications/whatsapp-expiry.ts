import "server-only";
import { randomUUID } from "node:crypto";
import { expiryBoundaries, localDateTimeParts } from "@/lib/dates/expiry";
import { digestDocumentCount } from "@/lib/email/expiry-email";
import { buildDigestFromRows } from "@/lib/notifications/expiry-notifications";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  EXPIRY_SUMMARY_TEMPLATE_LANGUAGE,
  EXPIRY_SUMMARY_TEMPLATE_NAME,
  buildDocumentExpirySummaryComponents,
  type TenantExpiryCounts,
} from "@/lib/whatsapp/expiry-template";
import {
  normalizeWhatsAppRecipient,
  sendWhatsAppTemplateMessage,
  type WhatsAppSendResult,
} from "@/lib/whatsapp/sender";

const DELIVERY_WINDOW_MINUTES = 15;
const TENANT_BATCH_SIZE = 200;
const SEND_CONCURRENCY = 5;

export type WhatsAppTenant = {
  id: string;
  name: string;
  timezone: string;
  whatsapp_notifications_enabled: boolean;
  whatsapp_recipient_phone: string | null;
  whatsapp_notification_time: string;
};

export type WhatsAppDispatchAction =
  | "skipped_disabled"
  | "skipped_no_recipient"
  | "skipped_wrong_time"
  | "skipped_zero_expiry"
  | "skipped_already_sent"
  | "accepted"
  | "failed";

type DispatchDependencies = {
  getSummary(tenant: WhatsAppTenant, localDate: string): Promise<TenantExpiryCounts>;
  claim(tenant: WhatsAppTenant, localDate: string, counts: TenantExpiryCounts): Promise<string | null>;
  send(tenant: WhatsAppTenant, counts: TenantExpiryCounts): Promise<WhatsAppSendResult>;
  recordAccepted(logId: string, result: Extract<WhatsAppSendResult, { success: true }>): Promise<void>;
  recordFailed(logId: string, result: Extract<WhatsAppSendResult, { success: false }>): Promise<void>;
};

function minutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const result = Number(match[1]) * 60 + Number(match[2]);
  return result >= 0 && result < 1440 ? result : undefined;
}

export function tenantLocalSchedule(now: Date, timezone: string) {
  try {
    return localDateTimeParts(now, timezone);
  } catch {
    return null;
  }
}

export function isWithinWhatsAppDeliveryWindow(currentTime: string, configuredTime: string) {
  const current = minutes(currentTime);
  const configured = minutes(configuredTime);
  return current !== undefined && configured !== undefined && current >= configured && current - configured < DELIVERY_WINDOW_MINUTES;
}

export async function dispatchWhatsAppExpiryForTenant(
  tenant: WhatsAppTenant,
  now: Date,
  dependencies: DispatchDependencies,
): Promise<{ action: WhatsAppDispatchAction; localDate?: string; messageId?: string }> {
  if (!tenant.whatsapp_notifications_enabled) return { action: "skipped_disabled" };
  const recipient = tenant.whatsapp_recipient_phone && normalizeWhatsAppRecipient(tenant.whatsapp_recipient_phone);
  if (!recipient || recipient !== tenant.whatsapp_recipient_phone)
    return { action: "skipped_no_recipient" };
  const schedule = tenantLocalSchedule(now, tenant.timezone);
  if (!schedule || !isWithinWhatsAppDeliveryWindow(schedule.time, tenant.whatsapp_notification_time))
    return { action: "skipped_wrong_time", localDate: schedule?.date };

  const counts = await dependencies.getSummary(tenant, schedule.date);
  if (!counts.total) return { action: "skipped_zero_expiry", localDate: schedule.date };
  const logId = await dependencies.claim(tenant, schedule.date, counts);
  if (!logId) return { action: "skipped_already_sent", localDate: schedule.date };

  const result = await dependencies.send(tenant, counts);
  if (result.success) {
    await dependencies.recordAccepted(logId, result);
    return { action: "accepted", localDate: schedule.date, messageId: result.messageId };
  }
  await dependencies.recordFailed(logId, result);
  return { action: "failed", localDate: schedule.date };
}

function schedulerLog(event: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ event: "whatsapp_expiry_scheduler", ...event })}\n`);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

export async function runWhatsAppExpiryNotifications(now = new Date()) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("WhatsApp expiry scheduler requires server-side Supabase configuration.");
  const runId = randomUUID();
  const tenants: WhatsAppTenant[] = [];
  for (let from = 0; ; from += TENANT_BATCH_SIZE) {
    const { data, error } = await admin
      .from("organizations")
      .select("id,name,timezone,whatsapp_notifications_enabled,whatsapp_recipient_phone,whatsapp_notification_time,organization_subscriptions!inner(status)")
      .eq("status", "active")
      .eq("is_active", true)
      .in("organization_subscriptions.status", ["trial", "active", "past_due"])
      .order("id")
      .range(from, from + TENANT_BATCH_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as WhatsAppTenant[];
    tenants.push(...page);
    if (page.length < TENANT_BATCH_SIZE) break;
  }

  const dependencies: DispatchDependencies = {
    async getSummary(tenant) {
      const { today, day31 } = expiryBoundaries(now, tenant.timezone);
      const { data, error } = await admin
        .from("documents")
        .select("organization_id,document_number,expires_on,status,is_active,archived_at,customers(full_name,status,is_active,archived_at),companies(name,status,is_active,archived_at),branches(name,status,is_active,archived_at),organization_document_types(name,status,is_active)")
        .eq("organization_id", tenant.id)
        .gte("expires_on", today)
        .lt("expires_on", day31)
        .is("archived_at", null)
        .order("expires_on");
      if (error) throw error;
      const digest = buildDigestFromRows(data ?? [], now, tenant.timezone);
      return {
        today: digest.today.length,
        next7Days: digest.next7Days.length,
        next30Days: digest.next30Days.length,
        total: digestDocumentCount(digest),
      };
    },
    async claim(tenant, localDate, counts) {
      const { data, error } = await admin
        .from("whatsapp_notifications")
        .insert({
          organization_id: tenant.id,
          notification_type: EXPIRY_SUMMARY_TEMPLATE_NAME,
          summary_local_date: localDate,
          recipient_phone: tenant.whatsapp_recipient_phone!,
          template_name: EXPIRY_SUMMARY_TEMPLATE_NAME,
          template_language: EXPIRY_SUMMARY_TEMPLATE_LANGUAGE,
          expiring_today_count: counts.today,
          next_7_days_count: counts.next7Days,
          next_30_days_count: counts.next30Days,
          total_count: counts.total,
          status: "processing",
        })
        .select("id")
        .maybeSingle();
      if (error?.code === "23505") return null;
      if (error) throw error;
      return data?.id ?? null;
    },
    send(tenant, counts) {
      return sendWhatsAppTemplateMessage({
        to: tenant.whatsapp_recipient_phone!,
        tenantId: tenant.id,
        templateName: EXPIRY_SUMMARY_TEMPLATE_NAME,
        languageCode: EXPIRY_SUMMARY_TEMPLATE_LANGUAGE,
        components: buildDocumentExpirySummaryComponents(tenant.name, counts),
      });
    },
    async recordAccepted(logId, result) {
      const acceptedAt = new Date().toISOString();
      const { data: notification, error } = await admin
        .from("whatsapp_notifications")
        .update({ status: "accepted", meta_message_id: result.messageId ?? null, accepted_at: acceptedAt })
        .eq("id", logId)
        .select("organization_id")
        .single();
      if (error) throw error;
      await admin.from("organizations").update({
        whatsapp_last_sent_at: acceptedAt,
        whatsapp_last_status: "accepted",
        whatsapp_last_message_id: result.messageId ?? null,
      }).eq("id", notification.organization_id);
    },
    async recordFailed(logId, result) {
      const failedAt = new Date().toISOString();
      const { data: notification, error } = await admin
        .from("whatsapp_notifications")
        .update({
          status: "failed",
          failed_at: failedAt,
          meta_error_code: result.error.code ?? null,
          meta_error_title: result.error.title?.slice(0, 500) ?? null,
          meta_error_message: result.error.message.slice(0, 500),
          meta_error_details: result.error.details?.slice(0, 500) ?? null,
        })
        .eq("id", logId)
        .select("organization_id")
        .single();
      if (error) throw error;
      await admin.from("organizations").update({ whatsapp_last_status: "failed" }).eq("id", notification.organization_id);
    },
  };

  const results = await mapWithConcurrency(tenants, SEND_CONCURRENCY, async (tenant) => {
    try {
      const result = await dispatchWhatsAppExpiryForTenant(tenant, now, dependencies);
      schedulerLog({ scheduler_run_id: runId, tenant_id: tenant.id, summary_local_date: result.localDate, action: result.action, message_id: result.messageId });
      return result.action;
    } catch (error) {
      schedulerLog({ scheduler_run_id: runId, tenant_id: tenant.id, action: "failed", error_code: error && typeof error === "object" && "code" in error ? String(error.code).slice(0, 40) : undefined });
      return "failed" as const;
    }
  });
  const summary = {
    tenantsEvaluated: tenants.length,
    eligible: results.filter((action) => action === "accepted" || action === "failed").length,
    sent: results.filter((action) => action === "accepted").length,
    skipped: results.filter((action) => action.startsWith("skipped_")).length,
    failed: results.filter((action) => action === "failed").length,
  };
  schedulerLog({ scheduler_run_id: runId, action: "run_complete", ...summary });
  return summary;
}
