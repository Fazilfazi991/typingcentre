import Link from "next/link";
import { WhatsAppTestControl } from "@/app/platform/whatsapp-test-control";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";
import { QA_TEMPLATE_NAMES, safeTemplate } from "@/lib/whatsapp/qa-console";
export const dynamic="force-dynamic";
export default async function Diagnostics(){await requirePlatformAdmin("/admin/whatsapp/diagnostics");const inspection=await inspectWhatsAppManagement(QA_TEMPLATE_NAMES).catch(()=>null);const safe=inspection?{graphApiVersion:inspection.graphApiVersion,wabaId:inspection.wabaId,permissions:inspection.permissions,paginationComplete:inspection.paginationComplete,returnedTemplateCount:inspection.returnedTemplateCount,templates:inspection.matchingTemplates.map(safeTemplate),error:inspection.error}:null;return <section className="admin-diagnostics-page"><div className="admin-page-heading"><div><p>Platform tools</p><h1>WhatsApp advanced diagnostics</h1><span>Inspect WhatsApp configuration, templates, delivery events and route health.</span></div><Link className="admin-secondary-link" href="/admin/whatsapp">← Back to WhatsApp</Link></div><WhatsAppTestControl initialInspection={safe}/></section>;}
