import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Note It collects, uses, stores, and protects account, business, customer, document, and notification information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains how Note It processes information when businesses use the service to manage documents, expiry dates, renewals, and follow-ups."
    >
      <section>
        <h2>1. About Note It</h2>
        <p>
          Note It is a multi-tenant software service for businesses such as typing centres. It is
          operated by <strong>Fusion Ventures FZ-LLC</strong>. Organizations use separate workspaces
          to manage their users and records relating to their own customers and companies.
        </p>
      </section>
      <section>
        <h2>2. Information We Collect</h2>
        <p>
          We process account identifiers and profile information such as a user ID, name, email
          address, authentication and session information, account status, role, permissions, and
          organization membership. During workspace setup and administration, we may also process an
          organization&apos;s name, legal name, business email, phone and WhatsApp number, address,
          location, logo, workspace settings, branch details, subscription plan and status, and
          authorized-user roles.
        </p>
        <p>
          Authentication credentials are handled through our authentication provider. Note It does
          not display users&apos; passwords to workspace users.
        </p>
      </section>
      <section>
        <h2>3. Customer and Business Records</h2>
        <p>
          Organization users decide what records to enter. Supported customer fields include names,
          customer type, phone and WhatsApp numbers, email, nationality, date of birth, gender,
          residential address, passport and Emirates ID numbers, profession, visa type, sponsor
          information, company and branch relationships, status, and notes.
        </p>
        <p>
          Supported company and branch fields include names, trade names, industry and business
          activity, company type, licence and establishment identifiers, immigration file, VAT and
          corporate-tax registration numbers, contact details, addresses, branch codes, status, and
          notes. Organizations may also create document, renewal, follow-up, notification, and
          activity records containing document numbers, issue and expiry dates, reminders, outcomes,
          dates, notes, and record status.
        </p>
      </section>
      <section>
        <h2>4. Uploaded Documents</h2>
        <p>
          Organization users may upload PDFs and images in supported formats for customers or
          companies. We process the file, filename, file type and size, storage identifier, upload
          status, document type and number, issue and expiry dates, corrected metadata, and retained
          document-version history. Uploaded files are stored in private object storage and are
          accessed through short-lived authorized links or server-side processing.
        </p>
      </section>
      <section>
        <h2>5. AI-Assisted Document Processing</h2>
        <p>
          When a user chooses document analysis, Note It sends the uploaded PDF or image content to
          Google&apos;s Gemini service with instructions to extract relevant document information.
          Returned fields can include document type, name, number, subject, dates, nationality,
          issuing authority, confidence indicators, warnings, and other detected fields.
        </p>
        <p>
          AI results are not automatically authoritative. The application presents them for review,
          and an authorized user can correct or replace values before confirming them. We do not
          make claims here about a provider&apos;s retention or model-training practices beyond the
          terms that apply to that provider&apos;s service.
        </p>
      </section>
      <section>
        <h2>6. How We Use Information</h2>
        <p>
          We use information to authenticate users; provide tenant workspaces; store and organize
          customer, company, and document records; process uploads; assist with extraction;
          calculate expiry windows; manage renewals and follow-ups; send enabled service
          notifications; maintain version and activity history; enforce permissions; troubleshoot
          failures; protect the service; and meet operational or legal obligations.
        </p>
        <p>
          Note It does not independently use an organization&apos;s customer records for customer
          marketing. Each organization is responsible for the information it enters and the
          communications it chooses to enable.
        </p>
      </section>
      <section>
        <h2>7. Notifications and WhatsApp</h2>
        <p>
          Where configured, Note It can prepare expiry summaries for an organization&apos;s primary
          owner by email. It also supports an optional WhatsApp expiry summary controlled by the
          organization owner. The WhatsApp feature stores the enabled setting, recipient number,
          preferred local delivery time, renewal counts, template and language, Meta message
          identifier, delivery timestamps and status, and limited failure details.
        </p>
        <p>
          The current expiry-summary feature is intended for organization-level operational
          reminders. It is not a general customer WhatsApp marketing service. Meta processes
          WhatsApp messages and delivery events under its own terms when this feature is used.
        </p>
      </section>
      <section>
        <h2>8. Service Providers</h2>
        <p>
          Note It relies on service providers to operate the product: Supabase for authentication
          and tenant-scoped database services; Cloudflare R2 for private document storage; Google
          Gemini for optional document extraction; Meta and WhatsApp for enabled WhatsApp
          notifications and delivery status; and Vercel for application hosting and delivery.
          Providers process information on our behalf or as otherwise described in their applicable
          terms.
        </p>
      </section>
      <section>
        <h2>9. Data Storage and Security</h2>
        <p>
          We use reasonable technical and organizational safeguards appropriate to the service.
          These include authentication, role-based access controls, tenant isolation through
          application and database controls, row-level access policies, private file storage,
          short-lived signed file access, webhook verification, and server-only credentials. No
          online service can guarantee absolute security.
        </p>
      </section>
      <section>
        <h2>10. Tenant and Organization Data</h2>
        <p>
          Each organization controls the business records its authorized users enter. Access is
          limited according to organization membership and role. Organization owners and admins are
          responsible for authorizing users, ensuring they have a lawful basis to manage customer
          and company data, maintaining accurate records, and responding to their customers&apos;
          requests where applicable.
        </p>
      </section>
      <section>
        <h2>11. Data Retention</h2>
        <p>
          The application does not currently impose one universal automatic deletion period for all
          records. We may retain information while an account or organization is active, while
          needed to provide the service, maintain document or renewal history, resolve security and
          operational issues, or comply with applicable obligations. Data may also remain until an
          authorized deletion request is completed. Limited records may be retained when reasonably
          necessary for security, fraud prevention, financial, legal, or legitimate operational
          purposes.
        </p>
      </section>
      <section>
        <h2>12. Account and Data Deletion</h2>
        <p>
          Note It does not currently provide a self-service account-deletion control. Users and
          authorized organization representatives can follow our{" "}
          <Link href="/data-deletion">Data Deletion Instructions</Link>. We verify requests before
          acting to reduce the risk of unauthorized deletion, especially when a request concerns an
          organization workspace and its customer records.
        </p>
      </section>
      <section>
        <h2>13. User Rights and Choices</h2>
        <p>
          Depending on applicable law and your relationship with Note It, you may ask to access,
          correct, export, restrict, object to, or delete personal information associated with your
          account. Organization users can correct many operational records directly in the service.
          Requests concerning data entered by an organization may need to be directed to that
          organization, which controls those records.
        </p>
      </section>
      <section>
        <h2>14. International Processing</h2>
        <p>
          Our providers and their infrastructure may process information in countries other than the
          country where a user or customer is located. Where required, we take reasonable steps to
          use appropriate contractual and organizational protections for such processing.
        </p>
      </section>
      <section>
        <h2>15. Children&apos;s Privacy</h2>
        <p>
          Note It is a business service and is not directed to children. Organizations must only
          enter information about minors when they are authorized to do so and the processing is
          appropriate for their business and legal obligations.
        </p>
      </section>
      <section>
        <h2>16. Changes to This Policy</h2>
        <p>
          We may update this policy as the service, providers, or legal requirements change. We will
          publish the updated version here and revise the date above. Material changes may also be
          communicated through the service or an appropriate contact channel.
        </p>
      </section>
      <section>
        <h2>17. Contact Us</h2>
        <p>
          For privacy questions or requests, email{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
        <address>
          <strong>Note It</strong>
          <br />A product and service operated by Fusion Ventures FZ-LLC
        </address>
        <p>
          You may also review our <Link href="/terms">Terms of Service</Link> or follow the{" "}
          <Link href="/data-deletion">Data Deletion Instructions</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
