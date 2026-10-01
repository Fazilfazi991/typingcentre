"use client";
import Link from "next/link";
import React, { useState } from "react";
import type { DemoImportState } from "@/lib/imports/demo-types";
import styles from "./demo-import.module.css";

const statuses: Record<string, string> = {
  pending: "Preview",
  ready: "Ready",
  possible_duplicate: "Duplicate",
  invalid: "Needs Review",
  skipped: "Skipped",
  imported: "Imported",
  failed: "Failed",
};
export function DemoImport({
  initialSample,
  initialError = "",
}: {
  initialSample: DemoImportState | null;
  initialError?: string;
}) {
  const [sample, setSample] = useState(initialSample);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [confirmReset, setConfirmReset] = useState(false);
  const complete = Boolean(
    sample && ["completed", "completed_with_errors"].includes(sample.job.status),
  );
  const reviewed = Boolean(sample && sample.job.status !== "uploaded");
  const ready = sample?.rows.filter((row) => row.status === "ready").length ?? 0;
  const duplicates = sample?.rows.filter((row) => row.status === "possible_duplicate").length ?? 0;
  const review = sample?.rows.filter((row) => row.status === "invalid").length ?? 0;
  const skipped = sample?.rows.filter((row) => row.status === "skipped").length ?? 0;
  const step = complete ? 4 : reviewed && !duplicates && !review ? 3 : sample ? 2 : 1;

  async function action(action: "try" | "validate" | "skip" | "import" | "reset") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/imports/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Please try the sample again.");
      setSample(result.sample);
      setConfirmReset(false);
      // Reset changes the whole workspace. Clear cached route payloads as well as this preview.
      if (action === "reset") location.assign("/imports/new");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The sample could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.workflow} aria-busy={busy}>
      <header className="page-heading">
        <p className="eyebrow">Existing Excel / CSV records</p>
        <h1>Import Data</h1>
        <p>See how existing customer and document records can be brought into Note It.</p>
      </header>
      <p className={styles.notice}>
        <strong>DEMO MODE</strong> Only fictional sample data can be imported here.
      </p>
      <ol className={styles.steps} aria-label="Sample import progress">
        {["Choose sample", "Review", "Import", "Results"].map((label, index) => (
          <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!sample && (
        <section className={`panel ${styles.panel}`}>
          <h2>Bring your records together</h2>
          <p>
            Try 10 fictional records, including customers, a company, passports, Emirates IDs and
            visas. Review a duplicate and an expiry date before importing.
          </p>
          <div className={styles.actions}>
            <button className="primary-button" onClick={() => action("try")} disabled={busy}>
              {busy ? "Preparing sample…" : "Try Sample Import"}
            </button>
            <a
              className="secondary-button"
              href="/api/imports/demo/sample"
              download="note-it-demo-import.csv"
            >
              Download Sample CSV
            </a>
          </div>
        </section>
      )}
      {sample && !complete && (
        <section className={`panel ${styles.panel}`}>
          <header className={styles.file}>
            <div>
              <h2>{reviewed ? "Review & Validate" : "File preview"}</h2>
              <p>{sample.job.file_name}</p>
            </div>
            <strong>{sample.job.total_rows} rows detected</strong>
          </header>
          {reviewed && (
            <div className={styles.summary} aria-label="Validation summary">
              <span>
                <b>{ready}</b> Ready
              </span>
              <span>
                <b>{duplicates}</b> Duplicate
              </span>
              <span>
                <b>{review}</b> Needs Review
              </span>
              {skipped > 0 && (
                <span>
                  <b>{skipped}</b> Skipped
                </span>
              )}
            </div>
          )}
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Review note</th>
                </tr>
              </thead>
              <tbody>
                {sample.rows.map((row) => {
                  const values = reviewed
                    ? (row.normalized_data ?? row.source_data)
                    : row.source_data;
                  return (
                    <tr key={row.id}>
                      <td>{values.customer_name || values.company_name}</td>
                      <td>{values.document_type || "Customer"}</td>
                      <td>{reviewed ? (statuses[row.status] ?? row.status) : "Preview"}</td>
                      <td>
                        {row.issues?.join(" ") ||
                          (row.status === "possible_duplicate"
                            ? "Matches an existing fictional record."
                            : "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.cards}>
            {sample.rows.map((row) => {
              const values = reviewed ? (row.normalized_data ?? row.source_data) : row.source_data;
              return (
                <article key={row.id}>
                  <header>
                    <strong>{values.customer_name || values.company_name}</strong>
                    <span>{reviewed ? (statuses[row.status] ?? row.status) : "Preview"}</span>
                  </header>
                  <p>{values.document_type || "Customer"}</p>
                  {row.issues?.length ? (
                    <small>{row.issues.join(" ")}</small>
                  ) : row.status === "possible_duplicate" ? (
                    <small>Matches an existing fictional record.</small>
                  ) : null}
                </article>
              );
            })}
          </div>
          {!reviewed ? (
            <div className={styles.actions}>
              <button className="primary-button" disabled={busy} onClick={() => action("validate")}>
                {busy ? "Checking records…" : "Validate & Review"}
              </button>
            </div>
          ) : sample.job.status === "importing" ? (
            <p role="status">The shared sample is importing. Refresh to see its result.</p>
          ) : (
            <>
              {(duplicates > 0 || review > 0) && (
                <div className={styles.reviewNotice}>
                  <p>
                    Keep existing records and leave the ambiguous expiry date out of this import.
                  </p>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => action("skip")}
                  >
                    Skip duplicate & row needing review
                  </button>
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className="primary-button"
                  disabled={busy || !ready || duplicates > 0 || review > 0}
                  onClick={() => action("import")}
                >
                  {busy ? "Working…" : "Import Sample Data"}
                </button>
                <p>
                  Only the approved fictional records will be added to the shared Demo workspace.
                </p>
              </div>
            </>
          )}
        </section>
      )}
      {complete && sample && (
        <section className={`panel ${styles.panel}`} role="status">
          <h2>{sample.job.records_failed ? "Import finished with errors" : "Import Complete"}</h2>
          <p>The fictional records are now available in your Demo workspace.</p>
          <dl className={styles.results}>
            {[
              ["Customers created", sample.job.customers_created],
              ["Companies created", sample.job.companies_created],
              ["Documents created", sample.job.documents_created],
              ["Updated", sample.job.records_updated],
              ["Skipped", sample.job.records_skipped],
              ["Failed", sample.job.records_failed],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.actions}>
            <Link className="primary-button" href="/customers">
              View Customers
            </Link>
            <Link className="secondary-button" href="/documents">
              View Documents
            </Link>
            <Link className="secondary-button" href={`/settings/data-import/${sample.job.id}`}>
              View Import Details
            </Link>
          </div>
        </section>
      )}
      {(sample || error) && (
        <section className={`panel ${styles.panel}`}>
          <h2>{complete ? "Show it again" : "Start fresh"}</h2>
          <p>
            Reset restores the entire fictional Demo workspace, clears this import and returns Ahmed
            to Passport Missing.
          </p>
          {confirmReset ? (
            <div className={styles.actions}>
              <button className="primary-button" disabled={busy} onClick={() => action("reset")}>
                {busy ? "Restoring demo…" : "Confirm Reset Demo"}
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setConfirmReset(true)}
            >
              Reset Demo & Try Again
            </button>
          )}
        </section>
      )}
      <aside className={styles.private}>
        <p>Use your own company data after creating your private workspace.</p>
        <Link href="/signup">Create Your Workspace →</Link>
      </aside>
    </section>
  );
}
