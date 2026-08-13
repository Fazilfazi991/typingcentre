import { redirect } from "next/navigation";
import { resolveAuthDestination } from "@/lib/auth/destination";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";
import { WhatsAppTestControl } from "./whatsapp-test-control";

export const dynamic = "force-dynamic";
export default async function Platform() {
  if ((await resolveAuthDestination()) !== "/platform") redirect("/access-denied" as never);
  const inspection = await inspectWhatsAppManagement("document_expiry_summary").catch(() => null);
  return (
    <main className="workspace">
      <h1>Platform</h1>
      <p>Platform administration is connected. Tenant impersonation is not available.</p>
      <section
        className="panel whatsapp-test-control"
        aria-labelledby="template-inspection-heading"
      >
        <div className="panel-heading">
          <div>
            <h2 id="template-inspection-heading">WhatsApp template inspection</h2>
            <p>Read-only Meta Graph diagnostics. No credential values are displayed.</p>
          </div>
        </div>
        <div className="whatsapp-test-content">
          {inspection ? (
            <dl>
              <dt>Graph API version</dt>
              <dd>{inspection.graphApiVersion}</dd>
              <dt>WABA</dt>
              <dd>{inspection.wabaId}</dd>
              <dt>whatsapp_business_management</dt>
              <dd>{inspection.permissions.whatsapp_business_management}</dd>
              <dt>whatsapp_business_messaging</dt>
              <dd>{inspection.permissions.whatsapp_business_messaging}</dd>
              <dt>Pagination</dt>
              <dd>
                {inspection.pagesFetched} page(s),{" "}
                {inspection.paginationComplete ? "complete" : "incomplete"}
              </dd>
              <dt>Templates returned</dt>
              <dd>{inspection.returnedTemplateCount}</dd>
              <dt>Matching template locales</dt>
              <dd>
                {inspection.matchingTemplates.length
                  ? inspection.matchingTemplates
                      .map(
                        (template) =>
                          `${template.name ?? "unknown"}: ${template.language ?? "unknown"} / ${template.status ?? "unknown"} / ${template.category ?? "unknown"}`,
                      )
                      .join(", ")
                  : "None"}
              </dd>
              {inspection.error && (
                <>
                  <dt>Sanitized Meta error</dt>
                  <dd>
                    {inspection.error.httpStatus ? `HTTP ${inspection.error.httpStatus}; ` : ""}
                    {inspection.error.code ? `code ${inspection.error.code}; ` : ""}
                    {inspection.error.message}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p>Template inspection could not be completed.</p>
          )}
        </div>
      </section>
      <WhatsAppTestControl />
    </main>
  );
}
