"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDocumentExtraction, createDocumentUploadSession, extractUploadedDocument, finalizeDocumentUpload } from "./actions";
import type { DocumentExtraction } from "@/lib/document-ai/types";

type TypeOption = { id: string; name: string };
type Props = { documentId?: string; customerId?: string; companyId?: string; customerName?: string; companyName?: string; documentTypes: TypeOption[] };
const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function SmartUploadForm({ documentId: existingDocumentId, customerId, companyId, customerName, companyName, documentTypes }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState(documentTypes[0]?.id ?? "");
  const [stage, setStage] = useState<"select" | "uploading" | "analyzing" | "review" | "failed" | "saved">("select");
  const [message, setMessage] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [additional, setAdditional] = useState<Array<{ key: string; value: string }>>([]);
  const contextName = customerName || companyName || "selected record";
  const canStart = file && documentTypeId && allowed.includes(file.type) && file.size <= 10 * 1024 * 1024;
  const additionalFields = useMemo(() => additional, [additional]);

  function updateForm(name: string, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  function applyExtraction(data: DocumentExtraction) {
    setExtraction(data);
    setForm({ displayName: data.document_name, documentNumber: data.document_number ?? "", issueDate: data.issue_date ?? "", expiryDate: data.expiry_date ?? "", subjectName: data.subject_name ?? "", dateOfBirth: data.date_of_birth ?? "", nationality: data.nationality ?? "", issuingAuthority: data.issuing_authority ?? "" });
    setAdditional(Object.entries(data.additional_fields).map(([key, value]) => ({ key, value: typeof value === "string" ? value : JSON.stringify(value) })));
  }
  async function begin() {
    if (!file || !canStart) { setMessage("Choose a PDF, JPEG, PNG, or WebP file up to 10 MB."); return; }
    setMessage(""); setStage("uploading");
    const started = await createDocumentUploadSession({ documentId: existingDocumentId ?? "", documentTypeId, customerId: customerId ?? "", companyId: companyId ?? "", displayName: file.name.replace(/\.[^.]+$/, "") || "Uploaded document", documentNumber: "", issueDate: "", expiryDate: "", notes: "", originalFilename: file.name, mimeType: file.type, fileSizeBytes: file.size });
    if (!started.ok) { setStage("failed"); setMessage(started.message); return; }
    const response = await fetch(started.data.uploadUrl, { method: "PUT", headers: { "Content-Type": started.data.contentType }, body: file });
    if (!response.ok) { setStage("failed"); setMessage("The file could not be uploaded. Please try again."); return; }
    const finalized = await finalizeDocumentUpload({ versionId: started.data.versionId });
    if (!finalized.ok) { setStage("failed"); setMessage(finalized.message); return; }
    setDocumentId(started.data.documentId); setVersionId(started.data.versionId); setStage("analyzing");
    const analyzed = await extractUploadedDocument({ documentId: started.data.documentId, versionId: started.data.versionId });
    if (!analyzed.ok) { setStage("failed"); setMessage(analyzed.message); return; }
    applyExtraction(analyzed.data.extraction as DocumentExtraction); setStage("review");
  }
  async function confirm() {
    if (!extraction) return;
    setMessage("");
    const extractionData = { ...extraction, document_name: form.displayName, document_number: form.documentNumber || null, issue_date: form.issueDate || null, expiry_date: form.expiryDate || null, subject_name: form.subjectName || null, date_of_birth: form.dateOfBirth || null, nationality: form.nationality || null, issuing_authority: form.issuingAuthority || null, additional_fields: Object.fromEntries(additionalFields.filter((item) => item.key.trim()).map((item) => [item.key.trim(), item.value])) };
    const result = await confirmDocumentExtraction({ documentId, documentTypeId, displayName: form.displayName, documentNumber: form.documentNumber, issueDate: form.issueDate, expiryDate: form.expiryDate, extractionData });
    if (!result.ok) { setMessage(result.message); return; }
    setStage("saved"); router.refresh();
  }
  function enterManually() {
    applyExtraction({ document_type: "other", document_name: file?.name.replace(/\.[^.]+$/, "") || "Document", document_number: null, subject_type: "unknown", subject_name: null, issue_date: null, expiry_date: null, date_of_birth: null, nationality: null, issuing_authority: null, secondary_identifiers: [], additional_fields: {}, confidence: { document_type: "low", document_number: "low", issue_date: "low", expiry_date: "low", subject_name: "low" }, warnings: ["Entered manually after automatic extraction was unavailable."] });
    setStage("review"); setMessage("");
  }
  if (stage === "saved") return <section className="panel smart-upload success"><h2>Document saved</h2><p>The reviewed document details are now available in Note It’s expiry tracking.</p></section>;
  if (stage === "review" && extraction) return <section className="panel smart-upload"><p className="eyebrow">Extraction status</p><h1>Ready for review</h1><p>Detected: <b>{extraction.document_name}</b>. Nothing is saved to renewal fields until you confirm.</p>{extraction.confidence.expiry_date === "low" && <p className="form-error">Expiry date needs review.</p>}<div className="record-form"><fieldset><legend>Document details</legend><label>Document type<select value={documentTypeId} onChange={(e) => setDocumentTypeId(e.target.value)}>{documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Document name<input value={form.displayName} onChange={(e) => updateForm("displayName", e.target.value)} /></label><label>Document number<input value={form.documentNumber} onChange={(e) => updateForm("documentNumber", e.target.value)} /></label><label>Detected subject<input value={form.subjectName} onChange={(e) => updateForm("subjectName", e.target.value)} /></label><label>Issue date<input type="date" value={form.issueDate} onChange={(e) => updateForm("issueDate", e.target.value)} /></label><label>Expiry date<input type="date" value={form.expiryDate} onChange={(e) => updateForm("expiryDate", e.target.value)} /></label><label>Date of birth<input type="date" value={form.dateOfBirth} onChange={(e) => updateForm("dateOfBirth", e.target.value)} /></label><label>Nationality<input value={form.nationality} onChange={(e) => updateForm("nationality", e.target.value)} /></label><label className="wide">Issuing authority<input value={form.issuingAuthority} onChange={(e) => updateForm("issuingAuthority", e.target.value)} /></label></fieldset><fieldset><legend>Additional extracted information</legend>{additionalFields.length ? additionalFields.map((item, index) => <label key={`${item.key}-${index}`}><span>{item.key}</span><input value={item.value} onChange={(e) => setAdditional((current) => current.map((entry, position) => position === index ? { ...entry, value: e.target.value } : entry))} /></label>) : <p className="field-help">No additional information was detected.</p>}</fieldset><div className="actions"><button className="quiet-action" onClick={() => setStage("select")}>Upload again</button><button className="primary-button" onClick={confirm}>Confirm &amp; Save</button></div>{message && <p className="form-error">{message}</p>}</div></section>;
  return <section className="panel smart-upload"><p className="eyebrow">Smart document upload</p><h1>Upload &amp; Auto Fill</h1><p>Upload a scanned document for {contextName}. Gemini analyzes the private file only after it is securely stored, then you review every value before saving.</p><label className="upload-dropzone"><span>Choose PDF, JPG, PNG, or WebP</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setMessage(""); }} />{file && <small>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</small>}</label><label>Starting document type<select value={documentTypeId} onChange={(e) => setDocumentTypeId(e.target.value)}>{documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><p className="field-help">The detected type can be corrected on the review screen. Maximum file size: 10 MB.</p>{stage === "uploading" && <p>Uploading securely…</p>}{stage === "analyzing" && <p>Analyzing document…</p>}{message && <p className="form-error">{message}</p>}<div className="actions"><button className="primary-button" disabled={!canStart || stage === "uploading" || stage === "analyzing"} onClick={begin}>{stage === "failed" ? "Retry upload" : "Upload & Analyze"}</button>{stage === "failed" && documentId && <><button className="quiet-action" onClick={async () => { setStage("analyzing"); const retry = await extractUploadedDocument({ documentId, versionId }); if (retry.ok) { applyExtraction(retry.data.extraction as DocumentExtraction); setStage("review"); } else { setStage("failed"); setMessage(retry.message); } }}>Retry extraction</button><button className="quiet-action" onClick={enterManually}>Enter details manually</button></>}</div></section>;
}
