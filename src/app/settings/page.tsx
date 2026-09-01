import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WhatsAppSettingsForm } from "./whatsapp-settings-form";
import { getWhatsAppSettingsStatus } from "@/lib/whatsapp/settings-status";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { isDemoWorkspace } from "@/lib/demo/workspace";

export const dynamic = "force-dynamic";

const statusLabel = (value: string | null) => value ? value[0].toUpperCase() + value.slice(1) : "No deliveries yet";

export default async function SettingsPage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const demoMode = isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug });
  const [{ data: settings }, { data: latest }, { data: imports }] = await Promise.all([
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
    context.supabase
      .from("import_jobs")
      .select("id,file_name,source_format,status,total_rows,customers_created,companies_created,documents_created,records_updated,records_skipped,records_failed,created_at,completed_at")
      .eq("organization_id", context.organization.id)
      .order("created_at", { ascending: false })
      .limit(25),
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
      {demoMode ? <p className="settings-note">WhatsApp sending and configuration are disabled in Demo Mode.</p> : canManage ? <WhatsAppSettingsForm settings={{
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
    <section className="panel" id="data-import">
      <div className="panel-heading"><div><h2>Data Import</h2><p>{demoMode ? "Data import is disabled in Demo Mode." : "Bring in existing customer and document records without leaving your workspace."}</p></div>{!demoMode && <Link className="primary-button" href="/imports/new">Import Existing Data</Link>}</div>
      {imports?.length ? <div className="table-wrap"><table><thead><tr><th>File</th><th>Date</th><th>Created</th><th>Updated</th><th>Skipped</th><th>Status</th></tr></thead><tbody>{imports.map((item: any) => <tr key={item.id}><td><Link href={`/settings/data-import/${item.id}`}>{item.file_name}</Link><small>{item.source_format.toUpperCase()} · {item.total_rows} detected</small></td><td>{new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(item.created_at))}</td><td>{item.customers_created + item.companies_created + item.documents_created}</td><td>{item.records_updated}</td><td>{item.records_skipped}</td><td><Link href={`/settings/data-import/${item.id}`}>View details</Link></td></tr>)}</tbody></table></div> : <p className="settings-note">No imports yet. Your completed imports will appear here.</p>}
    </section>
  </WorkspaceShell>;
}
