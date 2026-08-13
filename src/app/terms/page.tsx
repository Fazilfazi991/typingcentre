import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing business use of the Note It document expiry, renewal, and follow-up service.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern access to and use of Note It, a business document-expiry and renewal-management service operated by Fusion Ventures FZ-LLC."
    >
      <section>
        <h2>1. About Note It</h2>
        <p>
          Note It helps businesses organize customer and company records, private document uploads,
          expiry dates, renewals, follow-ups, and enabled notifications. Note It is operated by{" "}
          <strong>Fusion Ventures FZ-LLC</strong> and is not a government authority.
        </p>
      </section>
      <section>
        <h2>2. Acceptance of Terms</h2>
        <p>
          By creating an account, joining an organization workspace, or using Note It, you agree to
          these Terms and our <Link href="/privacy-policy">Privacy Policy</Link>. If you use Note It
          for an organization, you confirm that you are authorized to accept these Terms for that
          organization.
        </p>
      </section>
      <section>
        <h2>3. Eligibility and Business Use</h2>
        <p>
          You must be legally able to enter into these Terms and use the service for legitimate
          business purposes. Note It is primarily intended for businesses such as typing centres,
          not for unsupervised use by children.
        </p>
      </section>
      <section>
        <h2>4. Accounts</h2>
        <p>
          You must provide accurate account information, protect your sign-in credentials, and
          promptly tell us about suspected unauthorized access. You are responsible for activity
          performed through your account unless applicable law provides otherwise.
        </p>
      </section>
      <section>
        <h2>5. Organization Responsibility</h2>
        <p>
          Each organization is responsible for its workspace, business configuration, customer and
          company records, enabled notifications, lawful instructions to Note It, and compliance
          with obligations that apply to its business. Organization owners must keep membership and
          contact settings current.
        </p>
      </section>
      <section>
        <h2>6. Authorized Users</h2>
        <p>
          Only authorized users may access an organization workspace. Owners and admins must assign
          appropriate roles and remove access when it is no longer needed. Users may only access the
          organization and records they are permitted to manage.
        </p>
      </section>
      <section>
        <h2>7. Customer and Company Information</h2>
        <p>
          Organizations decide what customer and company information to enter. They are responsible
          for having appropriate authority or another lawful basis to collect, upload, use, correct,
          communicate, retain, and delete that information. Note It processes these records to
          provide the service; it does not become the owner of an organization&apos;s customer data.
        </p>
      </section>
      <section>
        <h2>8. Uploaded Documents</h2>
        <p>
          You may upload supported PDFs and images only when you are authorized to process them. You
          are responsible for file contents, accuracy, classification, and lawful use. Private
          storage and access controls reduce risk but do not eliminate all security risks.
        </p>
      </section>
      <section>
        <h2>9. AI-Assisted Extraction</h2>
        <p>
          Note It may use Gemini to suggest information extracted from an uploaded document.
          AI-assisted extraction can be incomplete or wrong. Results are presented for human review
          and can be corrected before confirmation. You remain responsible for checking the original
          document and every value you choose to save.
        </p>
      </section>
      <section>
        <h2>10. Renewal and Expiry Tracking</h2>
        <p>
          Expiry calculations, dashboards, and renewal records are operational aids. You must verify
          official dates, requirements, status, and deadlines with the relevant document and
          authority before relying on them. A reminder, missing reminder, or displayed status does
          not extend an official deadline or replace professional advice.
        </p>
      </section>
      <section>
        <h2>11. WhatsApp and Notifications</h2>
        <p>
          Organizations may enable operational renewal summaries to an authorized owner contact.
          Delivery depends on accurate settings and third-party services such as email systems,
          Meta, and WhatsApp. Delivery, timing, and availability are not guaranteed. You are
          responsible for selecting an authorized recipient and using notifications lawfully.
        </p>
      </section>
      <section>
        <h2>12. User Responsibilities</h2>
        <p>
          You must use reasonable care, review saved information, keep records current, respect
          confidentiality, follow applicable laws, maintain any required customer notices or
          consents, and use the service only for authorized purposes.
        </p>
      </section>
      <section>
        <h2>13. Prohibited Use</h2>
        <p>
          You must not use Note It to break the law; violate privacy, intellectual-property, or
          other rights; access another tenant; upload malware; interfere with security or
          availability; probe or bypass controls; impersonate others; transmit unauthorized spam; or
          process information you are not permitted to handle.
        </p>
      </section>
      <section>
        <h2>14. Intellectual Property</h2>
        <p>
          Fusion Ventures FZ-LLC and its licensors retain rights in Note It, including its software,
          design, branding, and documentation. Subject to these Terms, we grant authorized users a
          limited, non-exclusive, non-transferable right to use the service for their
          organization&apos;s internal business activities. Organizations retain their rights in
          content they provide.
        </p>
      </section>
      <section>
        <h2>15. Third-Party Services</h2>
        <p>
          Note It depends on third-party infrastructure and services, including Supabase, Cloudflare
          R2, Google Gemini, Meta/WhatsApp, and Vercel. Their availability and processing may be
          governed by separate terms. We may replace or change providers where reasonably required
          to operate or improve the service.
        </p>
      </section>
      <section>
        <h2>16. Availability and Changes</h2>
        <p>
          We aim to operate Note It reliably but do not promise uninterrupted or error-free
          availability. Maintenance, provider incidents, security needs, or product changes may
          affect access. We may modify, add, or discontinue features with reasonable regard for
          active users.
        </p>
      </section>
      <section>
        <h2>17. Plans and Access</h2>
        <p>
          Workspace access and limits may depend on the organization&apos;s selected plan, trial,
          subscription status, and separately communicated commercial terms. These Terms do not
          create pricing, refund, service-level, or billing commitments that have not been expressly
          agreed with the organization.
        </p>
      </section>
      <section>
        <h2>18. Data and Privacy</h2>
        <p>
          Our <Link href="/privacy-policy">Privacy Policy</Link> explains how Note It processes
          information. Each organization remains responsible for its instructions, records, and
          obligations to the people and businesses whose information it manages.
        </p>
      </section>
      <section>
        <h2>19. Suspension and Termination</h2>
        <p>
          Access may be suspended or terminated when an account or subscription is inactive, these
          Terms are materially breached, use creates security or legal risk, payment or plan
          requirements separately agreed with the organization are not met, or continued service is
          not reasonably possible. Where appropriate, we will provide notice or an opportunity to
          resolve the issue.
        </p>
      </section>
      <section>
        <h2>20. Disclaimers</h2>
        <p>
          To the extent permitted by applicable law, Note It is provided on an “as available” basis.
          We do not guarantee that AI output, reminders, document data, or third-party services will
          always be complete, accurate, timely, or available. Nothing in Note It is government,
          legal, immigration, tax, or other professional advice.
        </p>
      </section>
      <section>
        <h2>21. Limitation of Liability</h2>
        <p>
          To the extent permitted by applicable law, Fusion Ventures FZ-LLC will not be liable for
          indirect, incidental, special, consequential, or punitive losses, or for lost profits,
          business, data, or opportunities arising from use of the service. Any liability that
          cannot lawfully be excluded remains subject to applicable law and any express written
          agreement with the organization.
        </p>
      </section>
      <section>
        <h2>22. Indemnity</h2>
        <p>
          To the extent permitted by applicable law, an organization will be responsible for losses
          or claims resulting from its unlawful content, unauthorized processing, material breach of
          these Terms, or misuse of Note It, except to the extent caused by Fusion Ventures FZ-LLC.
        </p>
      </section>
      <section>
        <h2>23. Applicable Law</h2>
        <p>
          These Terms are governed by the laws that apply to Fusion Ventures FZ-LLC and the service,
          subject to any mandatory rights that cannot be excluded. A specific forum, arbitration
          process, or jurisdiction applies only if separately agreed or required by law.
        </p>
      </section>
      <section>
        <h2>24. Changes to These Terms</h2>
        <p>
          We may update these Terms as the service or applicable requirements change. We will
          publish the revised terms here and update the date above. Continued use after an update
          takes effect constitutes acceptance where permitted by law.
        </p>
      </section>
      <section>
        <h2>25. Contact</h2>
        <p>
          Questions about these Terms may be sent to{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
        <address>
          <strong>Note It</strong>
          <br />A product and service operated by Fusion Ventures FZ-LLC
        </address>
      </section>
    </LegalPage>
  );
}
