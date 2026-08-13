import "server-only";
import { calculateDaysRemaining, expiryBoundaries } from "@/lib/dates/expiry";
import {
  buildExpiryEmail,
  type ExpiryDigest,
  type ExpiryEmailDocument,
} from "@/lib/email/expiry-email";
import { getResendClient } from "@/lib/email/resend-client";
import { getServerEnv } from "@/lib/config/env.server";
import { publicEnv } from "@/lib/config/env.public";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Relation<T> = T | T[] | null | undefined;
type OwnerMembership = { organization_id: string; user_id: string };
type OwnerProfile = { id: string; email: string | null; status: string };
const one = <T>(value: Relation<T>) => (Array.isArray(value) ? value[0] : value);
const isValidEmail = (value: string | null | undefined): value is string =>
  Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const active = (
  record: { is_active?: boolean; status?: string; archived_at?: string | null } | null | undefined,
) =>
  Boolean(
    record &&
    record.is_active !== false &&
    record.status !== "removed" &&
    record.status !== "suspended" &&
    !record.archived_at,
  );

export function emptyExpiryDigest(): ExpiryDigest {
  return { today: [], next7Days: [], next30Days: [] };
}
export function addDocumentToDigest(digest: ExpiryDigest, document: ExpiryEmailDocument) {
  if (document.daysRemaining === 0) digest.today.push(document);
  else if (document.daysRemaining >= 1 && document.daysRemaining <= 7)
    digest.next7Days.push(document);
  else if (document.daysRemaining >= 8 && document.daysRemaining <= 30)
    digest.next30Days.push(document);
}

export function resolveTenantOwnerEmails(memberships: OwnerMembership[], profiles: OwnerProfile[]) {
  const activeProfiles = new Map(
    profiles
      .filter((profile) => profile.status === "active" && isValidEmail(profile.email))
      .map((profile) => [profile.id, profile.email]),
  );
  return new Map(
    memberships.flatMap((membership) => {
      const email = activeProfiles.get(membership.user_id);
      return email ? [[membership.organization_id, email] as const] : [];
    }),
  );
}

export function groupDocumentsByOrganization(rows: Array<{ organization_id: string }>) {
  const groups = new Map<string, any[]>();
  for (const row of rows)
    groups.set(row.organization_id, [...(groups.get(row.organization_id) ?? []), row]);
  return groups;
}

export function buildDigestFromRows(rows: any[], now = new Date(), timezone?: string) {
  const digest = emptyExpiryDigest();
  for (const row of rows) {
    const customer = one<any>(row.customers);
    const company = one<any>(row.companies);
    const branch = one<any>(row.branches);
    const type = one<any>(row.organization_document_types);
    if (
      !active(row) ||
      !active(type) ||
      (customer && !active(customer)) ||
      (company && !active(company)) ||
      (branch && !active(branch))
    )
      continue;
    const daysRemaining = calculateDaysRemaining(row.expires_on, now, timezone);
    if (daysRemaining === undefined) continue;
    addDocumentToDigest(digest, {
      subjectName: customer?.full_name || company?.name || "Document record",
      documentType: type?.name || "Document",
      documentNumber: row.document_number,
      expiresOn: row.expires_on,
      daysRemaining,
      branchName: branch?.name,
    });
  }
  return digest;
}

function baseUrl() {
  return publicEnv.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function runDailyExpiryNotifications(now = new Date()) {
  const admin = getSupabaseAdminClient();
  const resend = getResendClient();
  const env = getServerEnv();
  if (!admin || !resend || !env.RESEND_FROM_EMAIL)
    throw new Error(
      "Expiry notifications require Supabase admin, RESEND_API_KEY, and RESEND_FROM_EMAIL configuration.",
    );
  const { today, day31 } = expiryBoundaries(now);
  const [
    { data: organizations, error: organizationsError },
    { data: rows, error: documentsError },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id,name,status,is_active,organization_subscriptions!inner(status)")
      .eq("status", "active")
      .eq("is_active", true)
      .in("organization_subscriptions.status", ["trial", "active", "past_due"]),
    admin
      .from("documents")
      .select(
        "organization_id,document_number,expires_on,status,archived_at,customers(full_name,status,is_active,archived_at),companies(name,status,is_active,archived_at),branches(name,status,is_active,archived_at),organization_document_types(name,is_active)",
      )
      .gte("expires_on", today)
      .lt("expires_on", day31)
      .is("archived_at", null)
      .order("expires_on"),
  ]);
  if (organizationsError) throw organizationsError;
  if (documentsError) throw documentsError;
  const organizationRows = organizations ?? [];
  const ids = organizationRows.map((organization: any) => organization.id);
  if (!ids.length) return { sent: 0, skipped: 0, failed: 0 };
  const { data: memberships, error: membershipsError } = await admin
    .from("organization_memberships")
    .select("organization_id,user_id")
    .in("organization_id", ids)
    .eq("role", "owner")
    .eq("status", "active")
    .eq("is_primary_owner", true);
  if (membershipsError) throw membershipsError;
  const ownerIds = (memberships ?? []).map((membership: any) => membership.user_id);
  const { data: profiles, error: profilesError } = ownerIds.length
    ? await admin
        .from("profiles")
        .select("id,email,status")
        .in("id", ownerIds)
        .eq("status", "active")
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const owners = resolveTenantOwnerEmails(memberships ?? [], profiles ?? []);
  const documentsByOrganization = groupDocumentsByOrganization(rows ?? []);
  let sent = 0,
    skipped = 0,
    failed = 0;
  for (const organization of organizationRows as any[]) {
    const recipient = owners.get(organization.id);
    const digest = buildDigestFromRows(documentsByOrganization.get(organization.id) ?? [], now);
    if (
      !recipient ||
      (!digest.today.length && !digest.next7Days.length && !digest.next30Days.length)
    ) {
      skipped++;
      continue;
    }
    const claimed = await admin
      .from("notification_logs")
      .insert({
        organization_id: organization.id,
        notification_type: "expiry_daily_digest",
        recipient_email: recipient,
        notification_date: today,
        document_count: digest.today.length + digest.next7Days.length + digest.next30Days.length,
        status: "processing",
      })
      .select("id")
      .maybeSingle();
    let logId = claimed.data?.id;
    if (claimed.error) {
      const { data: existing } = await admin
        .from("notification_logs")
        .select("id,status")
        .eq("organization_id", organization.id)
        .eq("notification_type", "expiry_daily_digest")
        .eq("notification_date", today)
        .maybeSingle();
      if (existing?.status === "sent" || existing?.status === "processing") {
        skipped++;
        continue;
      }
      const { data: retried } = await admin
        .from("notification_logs")
        .update({ status: "processing", error_message: null, recipient_email: recipient })
        .eq("id", existing?.id ?? "")
        .eq("status", "failed")
        .select("id")
        .maybeSingle();
      if (!retried) {
        skipped++;
        continue;
      }
      logId = retried.id;
    }
    if (!logId) {
      skipped++;
      continue;
    }
    try {
      const email = buildExpiryEmail({
        organizationName: organization.name,
        digest,
        dashboardUrl: `${baseUrl()}/documents?expiry=7-days`,
      });
      const result = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: recipient,
        subject: email.subject,
        html: email.html,
      });
      if (result.error) throw new Error(result.error.message);
      await admin
        .from("notification_logs")
        .update({
          status: "sent",
          provider_message_id: result.data?.id ?? null,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", logId);
      sent++;
    } catch (error) {
      await admin
        .from("notification_logs")
        .update({
          status: "failed",
          error_message:
            error instanceof Error ? error.message.slice(0, 1000) : "Unknown email provider error",
        })
        .eq("id", logId);
      failed++;
    }
  }
  return { sent, skipped, failed };
}

export async function sendTestExpiryDigest(input: {
  organizationId: string;
  recipientEmail: string;
  now?: Date;
}) {
  const admin = getSupabaseAdminClient();
  const resend = getResendClient();
  const env = getServerEnv();
  if (!admin || !resend || !env.RESEND_FROM_EMAIL)
    throw new Error("Email configuration is incomplete.");
  const now = input.now ?? new Date();
  const { today, day31 } = expiryBoundaries(now);
  const [{ data: organization }, { data: rows }] = await Promise.all([
    admin
      .from("organizations")
      .select("id,name,status,is_active")
      .eq("id", input.organizationId)
      .eq("status", "active")
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("documents")
      .select(
        "organization_id,document_number,expires_on,status,archived_at,customers(full_name,status,is_active,archived_at),companies(name,status,is_active,archived_at),branches(name,status,is_active,archived_at),organization_document_types(name,is_active)",
      )
      .eq("organization_id", input.organizationId)
      .gte("expires_on", today)
      .lt("expires_on", day31)
      .is("archived_at", null),
  ]);
  if (!organization) throw new Error("Active organization not found.");
  const digest = buildDigestFromRows(rows ?? [], now);
  if (!digest.today.length && !digest.next7Days.length && !digest.next30Days.length)
    throw new Error("No upcoming active documents for this organization.");
  const email = buildExpiryEmail({
    organizationName: organization.name,
    digest,
    dashboardUrl: `${baseUrl()}/documents?expiry=7-days`,
  });
  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.recipientEmail,
    subject: `[TEST] ${email.subject}`,
    html: email.html,
  });
  if (result.error) throw new Error(result.error.message);
  return {
    documentCount: digest.today.length + digest.next7Days.length + digest.next30Days.length,
    providerMessageId: result.data?.id,
  };
}
