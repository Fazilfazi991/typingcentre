import React from "react";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { updateWhatsAppSettingsAction } from "@/features/settings/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

const statusLabel = (value: string | null) => value ? value[0].toUpperCase() + value.slice(1) : "No deliveries yet";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
  const params = await searchParams;
  const canManage = context.membership.role === "owner";
  const failure = latest?.status === "failed"
    ? latest.meta_error_details || latest.meta_error_message || latest.meta_error_title || "Meta rejected the delivery."
    : null;

  return <WorkspaceShell organizationName={context.organization.name} activePath="/settings">
    <header className="page-heading"><p className="eyebrow">Workspace settings</p><h1>Settings</h1><p>Manage tenant-specific delivery preferences.</p></header>
    <section className="panel whatsapp-settings-card">
      <div className="panel-heading"><div><h2>WhatsApp Notifications</h2><p>Receive a WhatsApp summary of upcoming document expiries for your workspace.</p></div></div>
      {params.saved === "1" && <p className="settings-alert success">WhatsApp notification settings saved.</p>}
      {params.error && <p className="settings-alert error">{params.error === "phone" ? "Enter a valid E.164 recipient, for example +971501234567." : params.error === "unauthorized" ? "Only the workspace owner can manage these settings." : "The settings could not be saved. Check the fields and try again."}</p>}
      <form action={updateWhatsAppSettingsAction} className="whatsapp-settings-form">
        <label className="settings-toggle"><span><b>Enable WhatsApp expiry summary</b><small>One summary per workspace local day when documents need attention.</small></span><input type="checkbox" name="enabled" defaultChecked={settings?.whatsapp_notifications_enabled ?? false} disabled={!canManage}/></label>
        <label><span>Recipient WhatsApp number</span><input name="phone" inputMode="tel" placeholder="+971501234567" defaultValue={settings?.whatsapp_recipient_phone ?? ""} disabled={!canManage}/><small>Use E.164 international format.</small></label>
        <label><span>Delivery time</span><input name="time" type="time" defaultValue={String(settings?.whatsapp_notification_time ?? "09:00").slice(0, 5)} disabled={!canManage}/></label>
        <label><span>Timezone</span><input value={context.organization.timezone} readOnly/><small>This uses the workspace timezone to avoid conflicting schedules.</small></label>
        {canManage ? <button className="primary-button" type="submit">Save WhatsApp settings</button> : <p className="settings-note">Only the workspace owner can change notification settings.</p>}
      </form>
      <div className="whatsapp-delivery-status">
        <div><small>Last sent</small><b>{settings?.whatsapp_last_sent_at ? new Intl.DateTimeFormat("en-AE", { timeZone: context.organization.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.whatsapp_last_sent_at)) : "Never"}</b></div>
        <div><small>Latest delivery status</small><b className={`delivery-${settings?.whatsapp_last_status ?? "none"}`}>{statusLabel(settings?.whatsapp_last_status ?? null)}</b></div>
        {failure && <div className="delivery-failure"><small>Sanitized failure reason</small><p>{failure}</p></div>}
      </div>
    </section>
  </WorkspaceShell>;
}
