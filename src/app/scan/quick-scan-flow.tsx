"use client";
/* eslint-disable @next/next/no-img-element -- local Blob URL previews cannot use Next's image optimizer. */

import "./quick-scan.css";

import Link from "next/link";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  classifyPendingScan,
  createPendingScanUpload,
  createQuickScanCustomer,
  extractPendingScan,
  finalizePendingScan,
  resolvePendingScanType,
  verifyPendingScanUpload,
} from "./actions";
import { uploadDocumentBinary } from "@/features/documents/smart-upload-form";
import { SearchableOwnerCombobox } from "@/components/searchable-owner-combobox";
import type { DocumentExtraction } from "@/lib/document-ai/types";

type TypeOption = { id: string; name: string };
type Props = { documentTypes: TypeOption[] };
const accepted = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function QuickScanFlow({ documentTypes }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [step, setStep] = useState<
    | "owner"
    | "type"
    | "capture"
    | "processing"
    | "verifying"
    | "classifying"
    | "detected"
    | "type_resolved"
    | "extracting"
    | "review"
    | "extraction_failed"
    | "saved"
  >("owner");
  const [ownerKind, setOwnerKind] = useState<"customer" | "company">("customer");
  const [ownerId, setOwnerId] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [typeId, setTypeId] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [pendingScanId, setPendingScanId] = useState("");
  const [resolvedType, setResolvedType] = useState<{
    id: string;
    name: string;
    source: "ai" | "manual";
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [resolvingType, setResolvingType] = useState(false);
  const [classificationTimedOut, setClassificationTimedOut] = useState(false);
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null);
  const [review, setReview] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState("");
  const classificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualPickerRequested = useRef(false);
  const selectedType = documentTypes.find((item) => item.id === typeId);
  const filteredTypes = documentTypes.filter((item) =>
    item.name.toLowerCase().includes(typeQuery.toLowerCase()),
  );

  useEffect(
    () => () => {
      if (classificationTimer.current) clearTimeout(classificationTimer.current);
    },
    [],
  );

  function clearClassificationTimer() {
    if (classificationTimer.current) {
      clearTimeout(classificationTimer.current);
      classificationTimer.current = null;
    }
  }

  function chooseTypeManually() {
    manualPickerRequested.current = true;
    clearClassificationTimer();
    setMessage("");
    setStep("type");
  }

  function applyExtraction(data: DocumentExtraction) {
    setExtraction(data);
    setReview({
      displayName: data.document_name,
      documentNumber: data.document_number ?? "",
      issueDate: data.issue_date ?? "",
      expiryDate: data.expiry_date ?? "",
      subjectName: data.subject_name ?? "",
      dateOfBirth: data.date_of_birth ?? "",
      nationality: data.nationality ?? "",
      issuingAuthority: data.issuing_authority ?? "",
      secondaryIdentifiers: JSON.stringify(data.secondary_identifiers, null, 2),
      additionalFields: JSON.stringify(data.additional_fields, null, 2),
    });
  }

  function enterDetailsManually() {
    applyExtraction({ document_type: "other", document_name: resolvedType?.name || "Document", document_number: null, subject_type: "unknown", subject_name: null, issue_date: null, expiry_date: null, date_of_birth: null, nationality: null, issuing_authority: null, secondary_identifiers: [], additional_fields: {}, confidence: { document_type: "low", document_number: "low", issue_date: "low", expiry_date: "low", subject_name: "low" }, warnings: ["Entered manually after extraction was unavailable."] });
    setMessage(""); setStep("review");
  }

  useEffect(() => {
    if (step !== "type_resolved" || !pendingScanId || extraction) return;
    let active = true;
    void extractPendingScan(pendingScanId).then((result) => {
      if (!active) return;
      if (!result.ok) { setMessage(result.message); setStep("extraction_failed"); return; }
      applyExtraction(result.data.extraction as DocumentExtraction); setStep("review");
    });
    return () => { active = false; };
  }, [step, pendingScanId, extraction]);

  function chooseFile(next: File | null) {
    if (!next) return;
    if (!accepted.includes(next.type) || next.size > 10 * 1024 * 1024) {
      setMessage("Choose a PDF, JPG, PNG or WebP file up to 10 MB.");
      return;
    }
    setFile(next);
    setMessage("");
    if (next.type.startsWith("image/")) setPreview(URL.createObjectURL(next));
    else setPreview("");
  }
  async function addCustomer() {
    setCreating(true);
    setMessage("");
    const result = await createQuickScanCustomer({ fullName: newName, phone: newPhone });
    setCreating(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    const customer = {
      id: result.data.id,
      full_name: result.data.full_name,
      phone: result.data.phone,
    };
    setOwnerKind("customer");
    setOwnerId(customer.id);
    setOwnerLabel(customer.full_name);
    setStep("capture");
  }
  async function process() {
    if (!file || !ownerId) return;
    setStep("processing");
    setMessage("");
    const started = await createPendingScanUpload({
      customerId: ownerKind === "customer" ? ownerId : undefined,
      companyId: ownerKind === "company" ? ownerId : undefined,
      originalFilename: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    });
    if (!started.ok) {
      setMessage(started.message);
      setStep("capture");
      return;
    }
    try {
      const response = await uploadDocumentBinary(started.data.uploadUrl, file.type, file);
      if (!response.ok) throw new Error("upload");
    } catch {
      setMessage("We couldn't upload this file. Check your connection and retry.");
      setStep("capture");
      return;
    }
    setPendingScanId(started.data.pendingScanId);
    manualPickerRequested.current = false;
    setStep("verifying");
    const verified = await verifyPendingScanUpload(started.data.pendingScanId);
    if (!verified.ok) {
      setMessage("We couldn't verify the upload.");
      setStep("capture");
      return;
    }
    setStep("classifying");
    setClassificationTimedOut(false);
    classificationTimer.current = setTimeout(() => {
      if (!manualPickerRequested.current) setClassificationTimedOut(true);
    }, 10_000);
    const classified = await classifyPendingScan(started.data.pendingScanId);
    clearClassificationTimer();
    if (manualPickerRequested.current) return;
    if (!classified.ok || classified.data.status === "manual_required") {
      setMessage("");
      setStep("type");
      return;
    }
    setTypeId(classified.data.tenantDocumentTypeId);
    setResolvedType({
      id: classified.data.tenantDocumentTypeId,
      name: classified.data.displayName,
      source: "ai",
    });
    setStep("detected");
  }
  return (
    <main className="scan-shell">
      <header className="scan-topbar">
        <Link href="/dashboard" aria-label="Back to dashboard">
          ← Back
        </Link>
        <b>Quick Scan</b>
        <span aria-hidden />
      </header>
      <section className="scan-workspace">
        <p className="scan-progress">
          {step === "owner"
            ? "1"
            : step === "type"
              ? "2"
              : step === "capture"
                ? "3"
                : step === "processing"
                  ? "4"
                  : "4"}{" "}
          of 4
        </p>
        {step === "owner" && (
          <>
            <h1>Who is this for?</h1>
            <p className="scan-copy">Choose the customer or company before scanning.</p>
            <div className="scan-segment">
              <button
                className={ownerKind === "customer" ? "active" : ""}
                onClick={() => {
                  setOwnerKind("customer");
                  setOwnerId("");
                  setOwnerLabel("");
                }}
              >
                Customer
              </button>
              <button
                className={ownerKind === "company" ? "active" : ""}
                onClick={() => {
                  setOwnerKind("company");
                  setOwnerId("");
                  setOwnerLabel("");
                }}
              >
                Company
              </button>
            </div>
            <SearchableOwnerCombobox kind={ownerKind} name="ownerId" value={ownerId} onChange={(value, option) => { setOwnerId(value); setOwnerLabel(option?.label ?? ""); }} />
            {ownerKind === "customer" && (
              <details className="scan-new-customer">
                <summary>+ Add new customer</summary>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Full name"
                />
                <input
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                  placeholder="Phone number"
                />
                <button disabled={creating} onClick={addCustomer}>
                  {creating ? "Adding…" : "Add & continue"}
                </button>
              </details>
            )}
            <button
              className="scan-primary scan-sticky"
              disabled={!ownerId}
              onClick={() => setStep("capture")}
            >
              Continue to camera
            </button>
          </>
        )}
        {step === "type" && (
          <>
            <h1>Choose document type</h1>
            <p className="scan-owner-pill">
              For <b>{ownerLabel}</b> · <button onClick={() => setStep("owner")}>Change</button>
            </p>
            <label className="scan-field">
              Search document type
              <input
                value={typeQuery}
                onChange={(event) => setTypeQuery(event.target.value)}
                placeholder="Search types"
              />
            </label>
            <div className="scan-type-list" role="listbox" aria-label="Document types">
              {filteredTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  role="option"
                  aria-selected={typeId === type.id}
                  className={typeId === type.id ? "selected" : ""}
                  onClick={() => setTypeId(type.id)}
                >
                  {type.name}
                </button>
              ))}
              {documentTypes.length > 0 && filteredTypes.length === 0 && (
                <p className="scan-help">No document types match that search.</p>
              )}
            </div>
            {!documentTypes.length && (
              <p className="scan-error">
                No active document types are configured for this workspace.
              </p>
            )}
            <p className="scan-help">
              We could not identify this document. Choose its type to continue.
            </p>
            {message && <p className="scan-error">{message}</p>}
            <button
              className="scan-primary scan-sticky"
              disabled={!typeId || resolvingType}
              onClick={async () => {
                if (!pendingScanId || !typeId) return;
                setResolvingType(true);
                setMessage("");
                const result = await resolvePendingScanType({
                  pendingScanId,
                  documentTypeId: typeId,
                });
                setResolvingType(false);
                if (!result.ok) {
                  setMessage("We couldn't save the document type. Try again.");
                  return;
                }
                setResolvedType({
                  id: result.data.tenantDocumentTypeId,
                  name: result.data.displayName,
                  source: "manual",
                });
                setStep("type_resolved");
              }}
            >
              {resolvingType ? "Saving…" : "Continue"}
            </button>
          </>
        )}
        {step === "capture" && (
          <>
            <h1>Capture document</h1>
            <p className="scan-copy">Place the document on a flat surface with good lighting.</p>
            {preview ? (
              <div className="scan-preview">
                <img src={preview} alt="Document preview" />
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                  }}
                >
                  Retake
                </button>
              </div>
            ) : (
              <div className="scan-capture">
                <span aria-hidden>▣</span>
                <b>Ready to scan</b>
                <small>Your document is uploaded securely and is not publicly accessible.</small>
              </div>
            )}
            <input
              ref={cameraInput}
              className="scan-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <input
              ref={galleryInput}
              className="scan-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            {file && <p className="scan-file">{file.name}</p>}
            {message && <p className="scan-error">{message}</p>}
            <div className="scan-capture-actions">
              <button className="scan-primary" onClick={() => cameraInput.current?.click()}>
                Take photo
              </button>
              <button className="scan-secondary" onClick={() => galleryInput.current?.click()}>
                Choose from gallery
              </button>
            </div>
            <button className="scan-primary scan-sticky" disabled={!file} onClick={process}>
              Process document
            </button>
          </>
        )}
        {step === "processing" && (
          <div className="scan-processing">
            <span className="progress-spinner" />
            <h1>Uploading document…</h1>
            <p>Uploading securely…</p>
            <p>Preparing upload verification…</p>
          </div>
        )}
        {(step === "verifying" || step === "classifying") && (
          <div className="scan-processing">
            <span className="progress-spinner" />
            <h1>{step === "verifying" ? "Checking upload…" : "Identifying document…"}</h1>
            <p>
              {step === "verifying"
                ? "Making sure your document uploaded correctly."
                : classificationTimedOut
                  ? "Still working…"
                  : "This usually takes a few seconds."}
            </p>
            {step === "classifying" && (
              <button className="scan-secondary" onClick={chooseTypeManually}>
                Choose type manually
              </button>
            )}
          </div>
        )}
        {step === "detected" && resolvedType && (
          <div className="scan-saved">
            <p>Detected document</p>
            <h1>{resolvedType.name}</h1>
            <div className="scan-capture-actions">
              <button className="scan-secondary" onClick={() => setStep("type")}>
                Change
              </button>
              <button className="scan-primary" onClick={() => setStep("type_resolved")}>
                Continue
              </button>
            </div>
          </div>
        )}
        {step === "type_resolved" && resolvedType && (
          <div className="scan-processing">
            <span className="progress-spinner" />
            <h1>Reading document…</h1>
            <p>Extracting details for {resolvedType.name}.</p>
            <button className="scan-secondary" onClick={enterDetailsManually}>Enter details manually</button>
          </div>
        )}
        {step === "extracting" && (
          <div className="scan-processing">
            <span className="progress-spinner" />
            <h1>Reading document…</h1>
            <p>Extracting details for your review.</p>
            <button className="scan-secondary" onClick={enterDetailsManually}>Enter details manually</button>
          </div>
        )}
        {step === "extraction_failed" && (
          <div className="scan-saved">
            <h1>We couldn&apos;t read all the details.</h1>
            <p>Your uploaded document is safe. You can retry or enter the details manually.</p>
            <div className="scan-capture-actions">
              <button className="scan-secondary" onClick={() => { setMessage(""); setStep("type_resolved"); }}>Try again</button>
              <button className="scan-primary" onClick={enterDetailsManually}>Enter details manually</button>
            </div>
          </div>
        )}
        {step === "review" && extraction && resolvedType && (
          <section className="scan-review">
            <p className="scan-progress">Review document</p>
            <h1>{resolvedType.name}</h1>
            <p className="scan-copy">For <b>{ownerLabel}</b>. Check the extracted details before saving.</p>
            <label className="scan-field">Document name<input value={review.displayName ?? ""} onChange={(event) => setReview((value) => ({ ...value, displayName: event.target.value }))} /></label>
            <label className="scan-field">Document number<input value={review.documentNumber ?? ""} onChange={(event) => setReview((value) => ({ ...value, documentNumber: event.target.value }))} /></label>
            <label className="scan-field">Expiry date<input type="date" value={review.expiryDate ?? ""} onInput={(event) => { const expiryDate = event.currentTarget.value; setReview((value) => ({ ...value, expiryDate })); }} /></label>
            <label className="scan-field">Issue date<input type="date" value={review.issueDate ?? ""} onInput={(event) => { const issueDate = event.currentTarget.value; setReview((value) => ({ ...value, issueDate })); }} /></label>
            <label className="scan-field">Full name<input value={review.subjectName ?? ""} onChange={(event) => setReview((value) => ({ ...value, subjectName: event.target.value }))} /></label>
            <label className="scan-field">Date of birth<input type="date" value={review.dateOfBirth ?? ""} onInput={(event) => { const dateOfBirth = event.currentTarget.value; setReview((value) => ({ ...value, dateOfBirth })); }} /></label>
            <label className="scan-field">Nationality<input value={review.nationality ?? ""} onChange={(event) => setReview((value) => ({ ...value, nationality: event.target.value }))} /></label>
            <label className="scan-field">Issuing authority<input value={review.issuingAuthority ?? ""} onChange={(event) => setReview((value) => ({ ...value, issuingAuthority: event.target.value }))} /></label>
            <label className="scan-field">Other identifiers<textarea value={review.secondaryIdentifiers ?? "[]"} onChange={(event) => setReview((value) => ({ ...value, secondaryIdentifiers: event.target.value }))} /></label>
            <label className="scan-field">Other extracted details<textarea value={review.additionalFields ?? "{}"} onChange={(event) => setReview((value) => ({ ...value, additionalFields: event.target.value }))} /></label>
            {message && <p className="scan-error">{message}</p>}
            <button className="scan-primary scan-sticky" disabled={saving || !(review.displayName ?? "").trim()} onClick={async () => {
              setSaving(true); setMessage("");
              let secondaryIdentifiers = extraction.secondary_identifiers;
              let additionalFields = extraction.additional_fields;
              try {
                const parsed = JSON.parse(review.secondaryIdentifiers || "[]");
                if (!Array.isArray(parsed)) throw new Error("not an array");
                secondaryIdentifiers = parsed;
                const details = JSON.parse(review.additionalFields || "{}");
                if (!details || typeof details !== "object" || Array.isArray(details)) throw new Error("not an object");
                additionalFields = details;
              } catch {
                setMessage("Other identifiers and details must use valid JSON."); setSaving(false); return;
              }
              const edited: DocumentExtraction = { ...extraction, document_name: review.displayName, document_number: review.documentNumber || null, issue_date: review.issueDate || null, expiry_date: review.expiryDate || null, subject_name: review.subjectName || null, date_of_birth: review.dateOfBirth || null, nationality: review.nationality || null, issuing_authority: review.issuingAuthority || null, secondary_identifiers: secondaryIdentifiers, additional_fields: additionalFields };
              const result = await finalizePendingScan({ pendingScanId, displayName: review.displayName, documentNumber: review.documentNumber, issueDate: review.issueDate, expiryDate: review.expiryDate, extractionData: edited });
              setSaving(false);
              if (!result.ok) { setMessage(result.message); return; }
              setSavedDocumentId(result.data.documentId); setStep("saved"); router.refresh();
            }}>{saving ? "Saving…" : "Confirm & Save"}</button>
          </section>
        )}
        {step === "saved" && resolvedType && (
          <div className="scan-saved">
            <span className="success-mark" aria-hidden>✓</span><p>Document saved</p><h1>{resolvedType.name}</h1>
            <p>{ownerLabel}{review.expiryDate ? ` · Expires ${review.expiryDate}` : ""}</p>
            <div className="scan-capture-actions">
              <button className="scan-primary" onClick={() => { setPendingScanId(""); setFile(null); setPreview(""); setResolvedType(null); setExtraction(null); setReview({}); setMessage(""); setStep("capture"); }}>Scan another</button>
              <button className="scan-secondary" onClick={() => router.push(savedDocumentId ? `/documents/${savedDocumentId}` : "/documents")}>View document</button>
            </div>
            <button className="scan-secondary" onClick={() => router.push(ownerKind === "customer" ? `/customers/${ownerId}` : `/companies/${ownerId}`)}>View {ownerKind}</button>
          </div>
        )}
      </section>
    </main>
  );
}
