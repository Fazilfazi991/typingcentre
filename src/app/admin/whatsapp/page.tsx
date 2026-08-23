import Link from "next/link";
import { WhatsAppTestControl } from "@/app/platform/whatsapp-test-control";
import { adminDate, requirePlatformAdmin } from "@/lib/platform/admin";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";
import { QA_TEMPLATE_NAMES, safeTemplate } from "@/lib/whatsapp/qa-console";

export const dynamic = "force-dynamic";

export default async function WhatsAppAdmin() {
  const { admin } = await requirePlatformAdmin("/admin/whatsapp");
  const [inspection, messages, centres] = await Promise.all([
    inspectWhatsAppManagement(QA_TEMPLATE_NAMES).catch(() => null),
    admin.from("whatsapp_notifications").select("id,organization_id,recipient_phone,summary_local_date,created_at,status,meta_error_message,retryable,retry_count,organizations(name)").order("created_at", { ascending: false }).limit(100),
    admin.from("organizations").select("id,name,whatsapp_notifications_enabled,whatsapp_recipient_phone,whatsapp_last_status").order("name"),
  ]);
  if (messages.error) throw messages.error;
  const sends = messages.data ?? [];
  const configuredCentres = (centres.data ?? []).filter((centre: any) => centre.whatsapp_notifications_enabled && centre.whatsapp_recipient_phone).length;
  const failedSends = sends.filter((send: any) => send.status === "failed").length;
  const latest = sends[0] as any;
  const template = inspection?.matchingTemplates.find((item) => item.name === "document_expiry_summary") ?? null;
  const safeInspection = inspection ? { graphApiVersion: inspection.graphApiVersion, wabaId: inspection.wabaId, permissions: inspection.permissions, paginationComplete: inspection.paginationComplete, returnedTemplateCount: inspection.returnedTemplateCount, templates: inspection.matchingTemplates.map(safeTemplate), error: inspection.error } : null;

  return <>
    <div className="admin-page-heading"><div><p>Provider monitoring</p><h1>WhatsApp</h1><span>Operational delivery health for typing centres. Credentials remain server-side.</span></div></div>
    <section className="admin-kpis">
      <article><small>WhatsApp API</small><strong>{inspection?.error ? "Needs attention" : "Connected"}</strong></article>
      <article><small>Current template</small><strong>{template?.status ?? "Unknown"}</strong><span>document_expiry_summary</span></article>
      <article><small>Configured centres</small><strong>{configuredCentres}</strong></article>
      <article><small>Failed sends</small><strong>{failedSends}</strong><span>Latest run: {adminDate(latest?.created_at)}</span></article>
    </section>
    <section className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Typing centre</th><th>Recipient</th><th>Digest date</th><th>Sent</th><th>Status</th><th>Retry</th><th>Failure</th></tr></thead><tbody>{sends.map((send: any) => <tr key={send.id}><td><Link href={`/admin/typing-centres/${send.organization_id}`}>{send.organizations?.name}</Link></td><td>{send.recipient_phone.replace(/(\+\d{3})\d+(\d{2})/, "$1••••$2")}</td><td>{send.summary_local_date}</td><td>{adminDate(send.created_at)}</td><td><span className="admin-badge">{send.status}</span></td><td>{send.retryable ? `${send.retry_count}/2` : "—"}</td><td>{send.meta_error_message ?? "—"}</td></tr>)}</tbody></table></section>
    <details className="admin-diagnostics"><summary>Advanced Diagnostics</summary><p>Restricted platform-admin tools. Configuration is shown as status only; no secret values are rendered.</p><WhatsAppTestControl initialInspection={safeInspection} /></details>
  </>;
}
