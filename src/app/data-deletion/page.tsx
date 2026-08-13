import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description:
    "How a Note It user or authorized organization representative can request account or organization-data deletion.",
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data Deletion Instructions"
      intro="Use the process below to request deletion of your Note It account, personal information associated with your account, or organization data you are authorized to manage."
    >
      <section>
        <h2>Before you begin</h2>
        <p>
          Note It does not currently provide a self-service account or organization deletion
          control. Deletion requests are handled by email and verified before action is taken. This
          protects users and organizations from unauthorized or accidental deletion.
        </p>
      </section>
      <section>
        <h2>How to submit a request</h2>
        <ol>
          <li>
            Email{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Note%20It%20data%20deletion%20request`}>
              {LEGAL_CONTACT_EMAIL}
            </a>{" "}
            from the address associated with your Note It account.
          </li>
          <li>
            Use the subject line <strong>Note It data deletion request</strong>.
          </li>
          <li>
            State whether you want to delete your user account and associated personal information,
            or an organization workspace and its related records.
          </li>
          <li>
            Include your account email and the organization or typing-centre name. Do not email
            passwords, document scans, Emirates ID numbers, passport numbers, or other unnecessary
            sensitive information.
          </li>
          <li>
            Respond to any reasonable verification request. Organization-wide deletion must be
            requested or approved by an authorized owner or representative.
          </li>
        </ol>
      </section>
      <section>
        <h2>What happens next</h2>
        <p>
          We will acknowledge the request through an appropriate contact channel, verify the
          requester&apos;s identity and authority, identify the affected account or workspace, and
          confirm the scope before deletion. We may ask for clarification where deleting an
          organization would also remove customer, company, document, version, renewal, follow-up,
          notification, or activity records belonging to other authorized users.
        </p>
      </section>
      <section>
        <h2>Scope of deletion</h2>
        <p>
          Depending on the verified request, deletion may cover the authentication account, profile,
          organization membership, organization configuration, customer and company records,
          document metadata and private files, extracted or corrected information, document
          versions, renewal and follow-up records, and tenant notification history.
        </p>
        <p>
          If the request concerns records entered by your employer or another organization, that
          organization may control those records. We may direct the request to the organization or
          require its authorization before deleting them.
        </p>
      </section>
      <section>
        <h2>Information that may be retained</h2>
        <p>
          Some limited information may be retained when reasonably necessary for security, fraud
          prevention, legal or financial obligations, dispute handling, service integrity, or
          legitimate operational requirements. Where deletion from active systems is appropriate,
          residual copies may remain temporarily in protected backups until they are overwritten
          through normal backup processes.
        </p>
      </section>
      <section>
        <h2>Need help?</h2>
        <p>
          Contact <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> and explain
          what you need without sending unnecessary sensitive documents.
        </p>
        <address>
          <strong>Note It</strong>
          <br />A product and service operated by Fusion Ventures FZ-LLC
        </address>
        <p>
          For more information, read the <Link href="/privacy-policy">Privacy Policy</Link> and{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
