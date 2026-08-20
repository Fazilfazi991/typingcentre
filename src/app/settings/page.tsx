import React from "react";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WhatsAppSettingsForm } from "./whatsapp-settings-form";
import { getWhatsAppSettingsStatus } from "@/lib/whatsapp/settings-status";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const statusLabel = (value: string | null) => value ? value[0].toUpperCase() + value.slice(1) : "No deliveries yet";

export default async function SettingsPage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const [{ data: settings }, { data: latest }] = await Promise.all([
    context.supabase
      .from("organizations")
      .select("whatsapp_notifications_enabled,whatsapp_recipient_phone,whatsapp_notification_time,whatsapp_last_sent_at,whatsapp_last_status")
      .eq("id", context.organization.id)
      .single(),
    context.supabase
      .from("whatsapp_notifications")
      .select("status,meta_error_title,meta_error_message,meta_error_details,created_at")
      .eq("organization_id", context.organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const canManage = context.membership.role === "owner";
  const failure = latest?.status === "failed"
    ? latest.meta_error_details || latest.meta_error_message || latest.meta_error_title || "Meta rejected the delivery."
    : null;
  const whatsappStatus = getWhatsAppSettingsStatus({
    enabled: settings?.whatsapp_notifications_enabled ?? false,
    deliveryTime: String(settings?.whatsapp_notification_time ?? "09:00").slice(0, 5),
    lastSentAt: settings?.whatsapp_last_sent_at ?? null,
    timezone: context.organization.timezone,
  });

  return <WorkspaceShell organizationName={context.organization.name} activePath="/settings">
    <header className="page-heading"><p className="eyebrow">Workspace settings</p><h1>Settings</h1><p>Manage tenant-specific delivery preferences.</p></header>
    <section className="panel whatsapp-settings-card">
      <div className="panel-heading"><div><h2>WhatsApp Notifications</h2><p>Receive a WhatsApp summary of upcoming document expiries for your workspace.</p></div></div>
      {canManage ? <WhatsAppSettingsForm settings={{
        enabled: settings?.whatsapp_notifications_enabled ?? false,
        phone: settings?.whatsapp_recipient_phone ?? "",
        time: String(settings?.whatsapp_notification_time ?? "09:00").slice(0, 5),
      }} timezone={context.organization.timezone} dailyStatus={whatsappStatus}/> : <p className="settings-note">Only the workspace owner can change notification settings.</p>}
      <div className="whatsapp-delivery-status">
        <div><small>Last sent</small><b>{settings?.whatsapp_last_sent_at ? new Intl.DateTimeFormat("en-AE", { timeZone: context.organization.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.whatsapp_last_sent_at)) : "Never"}</b></div>
        <div><small>Latest delivery status</small><b className={`delivery-${settings?.whatsapp_last_status ?? "none"}`}>{statusLabel(settings?.whatsapp_last_status ?? null)}</b></div>
        {failure && <div className="delivery-failure"><small>Sanitized failure reason</small><p>{failure}</p></div>}
      </div>
    </section>
  </WorkspaceShell>;
}
