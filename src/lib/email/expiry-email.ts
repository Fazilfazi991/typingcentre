import "server-only";

export type ExpiryEmailDocument = {
  subjectName: string;
  documentType: string;
  documentNumber?: string | null;
  expiresOn: string;
  daysRemaining: number;
  branchName?: string | null;
};

export type ExpiryDigest = {
  today: ExpiryEmailDocument[];
  next7Days: ExpiryEmailDocument[];
  next30Days: ExpiryEmailDocument[];
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-AE", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
const remaining = (days: number) =>
  days === 0 ? "Today" : days === 1 ? "1 day remaining" : `${days} days remaining`;

export function digestDocumentCount(digest: ExpiryDigest) {
  return digest.today.length + digest.next7Days.length + digest.next30Days.length;
}

export function buildExpiryEmail(input: {
  organizationName: string;
  digest: ExpiryDigest;
  dashboardUrl: string;
}) {
  const count = digestDocumentCount(input.digest);
  const rows = (documents: ExpiryEmailDocument[]) =>
    documents
      .map(
        (document) =>
          `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(document.documentType)}</strong><br><span style="color:#374151">${escapeHtml(document.subjectName)}</span>${document.documentNumber ? `<br><span style="color:#6b7280">No: ${escapeHtml(document.documentNumber)}</span>` : ""}${document.branchName ? `<br><span style="color:#6b7280">${escapeHtml(document.branchName)}</span>` : ""}</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap"><strong>${formatDate(document.expiresOn)}</strong><br><span style="color:#b45309">${remaining(document.daysRemaining)}</span></td></tr>`,
      )
      .join("");
  const section = (title: string, documents: ExpiryEmailDocument[]) =>
    documents.length
      ? `<h2 style="font-size:14px;letter-spacing:.04em;color:#374151;margin:28px 0 4px">${title} (${documents.length})</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows(documents)}</table>`
      : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><main style="max-width:620px;margin:24px auto;background:#fff;padding:32px;border-radius:10px"><div style="font-size:20px;font-weight:700;color:#1d4ed8">RenewTrack</div><h1 style="font-size:24px;margin:24px 0 8px">Expiry summary</h1><p style="margin:0;color:#4b5563">${escapeHtml(input.organizationName)}</p><p style="line-height:1.5">You have <strong>${count}</strong> document${count === 1 ? "" : "s"} requiring attention.</p><table role="presentation" width="100%" style="background:#eff6ff;border-radius:8px;padding:12px"><tr><td>Today<br><strong>${input.digest.today.length}</strong></td><td>Next 7 days<br><strong>${input.digest.next7Days.length}</strong></td><td>Next 30 days<br><strong>${input.digest.next30Days.length}</strong></td></tr></table>${section("EXPIRING TODAY", input.digest.today)}${section("NEXT 7 DAYS", input.digest.next7Days)}${section("NEXT 30 DAYS", input.digest.next30Days)}<p style="margin:32px 0 8px"><a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700">View Expiring Documents</a></p><p style="font-size:12px;color:#6b7280">Automated expiry notification from RenewTrack.</p></main></body></html>`;
  return { subject: `RenewTrack: ${count} document${count === 1 ? "" : "s"} need attention`, html };
}
