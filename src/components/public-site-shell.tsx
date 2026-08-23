import React from "react";
import Image from "next/image";
import Link from "next/link";

export const LEGAL_CONTACT_EMAIL = "fazil@zorxmedia.com";

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site-shell">
      <header className="public-site-header">
        <Link className="public-site-brand" href="/login" aria-label="Note It sign in">
          <Image src="/brand/note-it-logo.png" alt="Note It" width={174} height={57} priority />
        </Link>
        <Link className="public-site-sign-in" href="/login">
          Sign in
        </Link>
      </header>
      {children}
      <footer className="public-site-footer">
        <div>
          <strong>Note It</strong>
          <span>A product and service operated by Fusion Ventures FZ-LLC.</span>
        </div>
        <nav aria-label="Legal">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/data-deletion">Data Deletion</Link>
        </nav>
      </footer>
    </div>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <PublicSiteShell>
      <main className="legal-page">
        <header className="legal-page-intro">
          <p className="legal-eyebrow">Note It · Fusion Ventures FZ-LLC</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <p className="legal-updated">
            <strong>Last updated:</strong> August 14, 2026
          </p>
        </header>
        <article className="legal-content">{children}</article>
      </main>
    </PublicSiteShell>
  );
}
