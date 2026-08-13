"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp/sender";
import { getWorkspaceContext } from "@/lib/workspace/context";

const settingsSchema = z.object({
  enabled: z.boolean(),
  phone: z.string().trim().max(32),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export async function updateWhatsAppSettingsAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!context || context.membership.role !== "owner") redirect("/settings?error=unauthorized" as never);
  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    phone: String(formData.get("phone") ?? ""),
    time: String(formData.get("time") ?? ""),
  });
  if (!parsed.success) redirect("/settings?error=invalid" as never);
  const normalized = parsed.data.phone ? normalizeWhatsAppRecipient(parsed.data.phone) : null;
  if ((parsed.data.phone && !normalized) || (parsed.data.enabled && !normalized))
    redirect("/settings?error=phone" as never);

  const { error } = await context.supabase
    .from("organizations")
    .update({
      whatsapp_notifications_enabled: parsed.data.enabled,
      whatsapp_recipient_phone: normalized,
      whatsapp_notification_time: parsed.data.time,
    })
    .eq("id", context.organization.id);
  if (error) redirect("/settings?error=save" as never);
  revalidatePath("/settings");
  redirect("/settings?saved=1" as never);
}
