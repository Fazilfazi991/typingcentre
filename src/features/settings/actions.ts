"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp/sender";
import { getWorkspaceContext } from "@/lib/workspace/context";

export type WhatsAppSettingsActionState = {
  success?: boolean;
  error?: string;
};

const settingsSchema = z.object({
  enabled: z.boolean(),
  phone: z.string().trim().max(32),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
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
  });
  if (!parsed.success) return { error: "Enter a valid delivery time and recipient number." };
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
    })
    .eq("id", context.organization.id)
    .select("id, whatsapp_notifications_enabled, whatsapp_recipient_phone, whatsapp_notification_time");

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
