"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildDocumentExpirySummaryComponents,
  expirySummaryTemplateConfig,
} from "@/lib/whatsapp/expiry-template";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp/sender";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/sender";
import { getWorkspaceContext } from "@/lib/workspace/context";

export type WhatsAppSettingsActionState = {
  success?: boolean;
  error?: string;
};

const settingsSchema = z.object({
  enabled: z.boolean(),
  phone: z.string().trim().max(32),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().trim().min(1).max(100).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }),
});

export async function updateWhatsAppSettingsAction(
  _: WhatsAppSettingsActionState,
  formData: FormData,
): Promise<WhatsAppSettingsActionState> {
  const context = await getWorkspaceContext();
  if (!context || context.membership.role !== "owner")
    return { error: "Only the workspace owner can manage these settings." };
  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    phone: String(formData.get("phone") ?? ""),
    time: String(formData.get("time") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
  });
  if (!parsed.success) return { error: "Enter a valid delivery time, recipient number, and timezone." };
  const normalized = parsed.data.phone ? normalizeWhatsAppRecipient(parsed.data.phone) : null;
  if ((parsed.data.phone && normalized !== parsed.data.phone) || (parsed.data.enabled && !normalized))
    return { error: "Enter a valid E.164 recipient, for example +971523743418." };

  // The organization ID is derived from the authenticated server-side workspace context.
  // Selecting the updated row is deliberate: with RLS, an UPDATE that matches no visible
  // rows otherwise returns no error and previously led to a false success redirect.
  const { data, error } = await context.supabase
    .from("organizations")
    .update({
      whatsapp_notifications_enabled: parsed.data.enabled,
      whatsapp_recipient_phone: normalized,
      whatsapp_notification_time: parsed.data.time,
      timezone: parsed.data.timezone,
    })
    .eq("id", context.organization.id)
    .select("id, whatsapp_notifications_enabled, whatsapp_recipient_phone, whatsapp_notification_time, timezone");

  if (error || !data?.length) {
    process.stderr.write(`${JSON.stringify({
      event: "whatsapp_settings_save_failed",
      code: error?.code,
      message: error?.message,
      organizationId: context.organization.id,
      userId: context.user.id,
      updatedRows: data?.length ?? 0,
    })}\n`);
    return {
      error: error?.code === "42501"
        ? "You do not have permission to update this workspace."
        : "WhatsApp settings could not be saved. Please try again.",
    };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function sendTestWhatsAppAction(
  _: WhatsAppSettingsActionState,
  _formData: FormData,
): Promise<WhatsAppSettingsActionState> {
  const context = await getWorkspaceContext();
  if (!context || context.membership.role !== "owner")
    return { error: "Only the workspace owner can send a test WhatsApp." };

  // The recipient and organization are loaded from the authenticated workspace,
  // rather than accepting either value from the browser.
  const { data: organization, error } = await context.supabase
    .from("organizations")
    .select("name, whatsapp_recipient_phone")
    .eq("id", context.organization.id)
    .single();
  const recipient = organization?.whatsapp_recipient_phone
    ? normalizeWhatsAppRecipient(organization.whatsapp_recipient_phone)
    : null;
  if (error || !recipient || recipient !== organization?.whatsapp_recipient_phone)
    return { error: "Save a valid E.164 WhatsApp recipient before sending a test." };

  const template = expirySummaryTemplateConfig();
  const result = await sendWhatsAppTemplateMessage({
    to: recipient,
    tenantId: context.organization.id,
    templateName: template.name,
    languageCode: template.language,
    // The approved digest template is used because arbitrary free-form messages
    // are not deliverable outside a WhatsApp customer-service session. Zero
    // counts and the TEST suffix make clear this is not a live expiry digest.
    components: buildDocumentExpirySummaryComponents(`${organization.name} (TEST)`, {
      today: 0,
      next7Days: 0,
      next30Days: 0,
      total: 0,
    }),
  });
  if (!result.success) {
    process.stderr.write(`${JSON.stringify({
      event: "whatsapp_settings_test_failed",
      tenant_id: context.organization.id,
      error_type: result.error.type,
      error_code: result.error.code,
      response_status: result.responseStatus,
    })}\n`);
    return {
      error: result.error.type === "configuration"
        ? "WhatsApp is not configured for sending test messages."
        : result.error.type === "validation"
          ? "The saved WhatsApp recipient is not valid."
          : "Test WhatsApp could not be sent. Please try again.",
    };
  }

  process.stdout.write(`${JSON.stringify({
    event: "whatsapp_settings_test_accepted",
    tenant_id: context.organization.id,
    message_id: result.messageId,
    response_status: result.responseStatus,
  })}\n`);
  // Intentionally do not write organizations.whatsapp_last_* or the digest ledger.
  return { success: true };
}
