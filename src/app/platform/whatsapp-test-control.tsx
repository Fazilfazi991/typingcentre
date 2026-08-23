"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  QA_TEMPLATE_NAMES,
  templateReady,
  type QaTemplateName,
  type SafeTemplate,
} from "@/lib/whatsapp/qa-console";
import type { RouteHealth } from "@/lib/whatsapp/route-health";

type ConfigurationStatus = Record<
  | "WHATSAPP_ACCESS_TOKEN"
  | "WHATSAPP_PHONE_NUMBER_ID"
  | "WHATSAPP_BUSINESS_ACCOUNT_ID"
  | "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  boolean
>;
type TemplateInspection = {
  graphApiVersion: string;
  wabaId: string;
  permissions: Record<string, string>;
  paginationComplete: boolean;
  returnedTemplateCount: number;
  templates: SafeTemplate[];
  error?: { httpStatus?: number; code?: number; message: string };
};
type QaSend = {
  id?: string;
  template_name: string;
  template_language: string;
  recipient_masked: string;
  meta_message_id?: string | null;
  response_status?: number | null;
  status: "accepted" | "sent" | "delivered" | "read" | "failed";
  meta_error_code?: number | null;
  meta_error_title?: string | null;
  meta_error_message?: string | null;
  meta_error_details?: string | null;
  created_at: string;
  accepted_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
};
type SendResult = {
  success: boolean;
  failureType?: "validation" | "rate_limit" | "template" | "meta" | "local";
  error?: string | {
    code?: number;
    subcode?: number;
    title?: string;
    message?: string;
    details?: string;
  };
  messageId?: string;
  responseStatus?: number;
  templateName?: string;
  languageCode?: string;
  recipientMasked?: string;
  timestamp?: string;
};

const templateLabels: Record<QaTemplateName, string> = {
  hello_world: "hello_world",
  document_expiry_summary: "document_expiry_summary",
  document_expiry_summary_v2: "document_expiry_summary_v2",
  document_expiry_summary_v3: "document_expiry_summary_v3",
};
const configKeys: Array<keyof ConfigurationStatus> = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
];

function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function shortMessageId(value?: string | null) {
  if (!value) return "—";
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function resultMessage(result: SendResult) {
  return typeof result.error === "string"
    ? result.error
    : result.error?.message ?? "WhatsApp test send failed.";
}

export function TemplatePreview({ templateName, routes }: { templateName: QaTemplateName; routes: RouteHealth[] }) {
  const statusFor = (path: string) => routes.find((route) => route.path === path)?.label ?? "Unknown";
  if (templateName === "hello_world")
    return (
      <div className="wa-message-bubble">
        <p>Welcome and congratulations!!</p>
        <p>This message demonstrates your ability to send a WhatsApp template notification.</p>
      </div>
    );
  if (templateName === "document_expiry_summary")
    return (
      <div className="wa-message-bubble">
        <p>Hello Al Noor Typing Centre,</p>
        <p>You have 10 document renewals requiring attention.</p>
        <p>Expiring today: 2<br />Within 7 days: 5<br />Within 30 days: 3</p>
        <p>Open Note It to review the upcoming renewals.</p>
      </div>
    );
  if (templateName === "document_expiry_summary_v3")
    return <div className="wa-message-bubble"><p>Hello Al Noor Typing Centre,</p><p>You have 10 document renewals requiring attention.</p><p>Expiring today: 2<br />Within 7 days: 5<br />Within 30 days: 3</p><p>Open Note It to review upcoming renewals:</p><code>https://noteitapp.com/renewals?range=30d</code></div>;
  return (
    <>
      <div className="wa-message-bubble">
        <b>Document expiry summary</b>
        <p>Hello Al Noor Typing Centre,</p>
        <p>You have <strong>10 renewals that need your attention.</strong></p>
        <p>🔴 Expiring today: <strong>2</strong><br />🟠 Next 7 days: <strong>5</strong><br />🟡 Next 30 days: <strong>3</strong></p>
        <p>Review the records and follow up before they expire.</p>
        <div className="wa-preview-buttons" aria-label="Static template buttons">
          <span>Review urgent</span>
          <span>View all renewals</span>
        </div>
      </div>
      <div className="wa-cta-destinations">
        <div><code>https://noteitapp.com/renewals?range=today</code><b>{statusFor("/renewals?range=today")}</b></div>
        <div><code>https://noteitapp.com/renewals?range=30d</code><b>{statusFor("/renewals?range=30d")}</b></div>
      </div>
    </>
  );
}

export function SendResultPanel({ result }: { result: SendResult }) {
  return <section className={`panel qa-result-panel ${result.success ? "success" : "error"}`} aria-live="polite"><div className="panel-heading"><div><h2>{result.success ? "Meta accepted" : result.failureType === "rate_limit" ? "Local rate limit" : result.failureType === "meta" ? "Meta rejected" : "Local validation failed"}</h2><p>{result.success ? "The Cloud API accepted exactly one template request." : resultMessage(result)}</p></div></div>{result.success ? <dl><div><dt>HTTP accepted</dt><dd>{result.responseStatus ?? "—"}</dd></div><div><dt>Message ID</dt><dd><code>{result.messageId}</code></dd></div><div><dt>Template</dt><dd>{result.templateName}</dd></div><div><dt>Recipient</dt><dd>{result.recipientMasked}</dd></div><div><dt>Timestamp</dt><dd>{formatTime(result.timestamp)}</dd></div></dl> : typeof result.error === "object" && <dl><div><dt>Error code</dt><dd>{result.error.code ?? "—"}</dd></div><div><dt>Title</dt><dd>{result.error.title ?? "—"}</dd></div><div><dt>Details</dt><dd>{result.error.details ?? "—"}</dd></div></dl>}</section>;
}

function LatestSendPanel({ send, result }: { send: QaSend | null; result: SendResult | null }) {
  if (result) return <SendResultPanel result={result} />;
  return <section className="panel qa-result-panel"><div className="panel-heading"><div><p className="eyebrow">Latest send</p><h2>{send ? "Most recent QA request" : "No QA sends yet"}</h2><p>{send ? "Loaded from the isolated platform-admin QA ledger." : "History will appear here after an explicitly initiated test."}</p></div>{send && <span className={`qa-status ${send.status}`}>{send.status}</span>}</div>{send && <dl><div><dt>HTTP status</dt><dd>{send.response_status ?? "—"}</dd></div><div><dt>Template</dt><dd>{send.template_name}</dd></div><div><dt>Recipient</dt><dd>{send.recipient_masked}</dd></div><div><dt>Message ID</dt><dd><code>{shortMessageId(send.meta_message_id)}</code></dd></div><div><dt>Timestamp</dt><dd>{formatTime(send.created_at)}</dd></div></dl>}</section>;
}

export function WhatsAppTestControl({ initialInspection }: { initialInspection: TemplateInspection | null }) {
  const [configuration, setConfiguration] = useState<ConfigurationStatus | null>(null);
  const [inspection, setInspection] = useState(initialInspection);
  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [templateName, setTemplateName] = useState<QaTemplateName>("document_expiry_summary_v2");
  const [result, setResult] = useState<SendResult | null>(null);
  const [trackedSend, setTrackedSend] = useState<QaSend | null>(null);
  const [history, setHistory] = useState<QaSend[]>([]);
  const [routes, setRoutes] = useState<RouteHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const compactRecipient = recipient.replace(/\s+/g, "");
  const recipientValid = /^\+[1-9][0-9]{7,14}$/.test(compactRecipient);
  const selectedTemplate = inspection?.templates.find((template) => template.name === templateName);
  const ready = templateReady(selectedTemplate);
  const approvedCount = inspection?.templates.filter(templateReady).length ?? 0;
  const configCount = configuration ? configKeys.filter((key) => configuration[key]).length : 0;
  const latestSend = trackedSend ?? history[0] ?? null;

  async function loadRuntime() {
    const response = await fetch("/api/admin/whatsapp/test", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { configuration: ConfigurationStatus; history: QaSend[] };
    setConfiguration(payload.configuration);
    setHistory(payload.history);
  }

  async function loadRoutes() {
    const response = await fetch("/api/admin/whatsapp/route-health", { cache: "no-store" });
    if (response.ok) setRoutes(((await response.json()) as { routes: RouteHealth[] }).routes);
  }

  async function refreshTemplates() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/whatsapp/templates", { cache: "no-store" });
      if (response.ok) setInspection((await response.json()) as TemplateInspection);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadRuntime();
    void loadRoutes();
  }, []);

  useEffect(() => {
    if (!trackedSend?.meta_message_id || ["read", "failed"].includes(trackedSend.status)) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch(
        `/api/admin/whatsapp/status?messageId=${encodeURIComponent(trackedSend.meta_message_id!)}`,
        { cache: "no-store" },
      );
      if (response.ok) {
        const updated = ((await response.json()) as { send: QaSend }).send;
        setTrackedSend(updated);
        setHistory((current) => [updated, ...current.filter((item) => item.id !== updated.id)].slice(0, 12));
      }
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [trackedSend]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecipientTouched(true);
    setResult(null);
    setTrackedSend(null);
    if (!recipientValid || !ready) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: compactRecipient, templateName }),
      });
      const payload = (await response.json()) as SendResult;
      if (!payload.success && typeof payload.error === "undefined") payload.error = "The controlled send failed.";
      setResult(payload);
      if (payload.success && payload.messageId) {
        setTrackedSend({
          template_name: payload.templateName ?? templateName,
          template_language: payload.languageCode ?? selectedTemplate?.language ?? "unknown",
          recipient_masked: payload.recipientMasked ?? "********",
          meta_message_id: payload.messageId,
          response_status: payload.responseStatus,
          status: "accepted",
          created_at: payload.timestamp ?? new Date().toISOString(),
          accepted_at: payload.timestamp ?? new Date().toISOString(),
        });
        await loadRuntime();
      } else if (payload.failureType === "meta") await loadRuntime();
    } catch {
      setResult({ success: false, failureType: "local", error: "The protected WhatsApp test endpoint could not be reached." });
    } finally {
      setLoading(false);
    }
  }

  const timeline = useMemo(
    () => [
      ["Accepted", latestSend?.accepted_at],
      ["Sent", latestSend?.sent_at],
      ["Delivered", latestSend?.delivered_at],
      ["Read", latestSend?.read_at],
      ["Failed", latestSend?.failed_at],
    ] as const,
    [latestSend],
  );

  return (
    <>
      <header className="platform-qa-header">
        <p className="eyebrow">Internal tools</p>
        <h1>WhatsApp QA Console</h1>
        <p>Internal platform-admin tools for template, delivery, and webhook verification.</p>
      </header>

      <section className="platform-qa-summary" aria-label="WhatsApp QA summary">
        <article><span>Runtime config</span><b>{configuration ? `${configCount}/4 configured` : "Checking…"}</b><small>Boolean status only</small></article>
        <article><span>Production WABA</span><b>{inspection?.wabaId || "Unavailable"}</b><small>Graph {inspection?.graphApiVersion || "—"}</small></article>
        <article><span>Webhook status</span><b>{configuration?.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? "Configured" : configuration ? "Missing" : "Checking…"}</b><small>Messages subscription monitored</small></article>
        <article><span>Available templates</span><b>{approvedCount}</b><small>Approved with resolved language</small></article>
      </section>

      <section className="platform-test-grid">
        <div className="panel platform-send-panel">
          <div className="panel-heading"><div><h2>Controlled template test</h2><p>One click produces one protected API request. No automatic retries.</p></div></div>
          <form className="platform-send-form" onSubmit={submit} noValidate>
            <label>QA recipient<input value={recipient} onChange={(event) => setRecipient(event.target.value)} onBlur={() => setRecipientTouched(true)} placeholder="+971501234567" inputMode="tel" autoComplete="off" aria-invalid={recipientTouched && !recipientValid} /></label>
            <small>Use full international format including +</small>
            {recipientTouched && !recipientValid && <p className="qa-inline-error" role="alert">Recipient must be in E.164 format and start with +.</p>}
            <label>Template<select value={templateName} onChange={(event) => setTemplateName(event.target.value as QaTemplateName)}>{QA_TEMPLATE_NAMES.map((name) => { const template = inspection?.templates.find((item) => item.name === name); return <option key={name} value={name}>{templateLabels[name]} — {template?.status ?? "not returned"} / {template?.language ?? "unresolved"}</option>; })}</select></label>
            <div className="qa-template-readiness"><span>Graph status</span><b>{selectedTemplate?.status ?? "Not returned"}</b><span>Exact language</span><b>{selectedTemplate?.language ?? "Unresolved"}</b></div>
            {!ready && <p className="qa-inline-error">Send is disabled until Graph returns this template as APPROVED with a language.</p>}
            <button className="primary-button" type="submit" disabled={loading || !recipientValid || !ready}>{loading ? "Sending one controlled test…" : "Send one template test"}</button>
          </form>
        </div>
        <div className="panel platform-preview-panel">
          <div className="panel-heading"><div><h2>WhatsApp preview</h2><p>Fixed QA content. Static buttons send no runtime parameters.</p></div></div>
          <div className="wa-preview-canvas"><TemplatePreview templateName={templateName} routes={routes} /></div>
        </div>
      </section>

      <section className="platform-latest-grid">
        <LatestSendPanel send={latestSend} result={result} />
        <section className="panel qa-delivery-panel">
          <div className="panel-heading"><div><h2>Delivery timeline</h2><p>{trackedSend?.meta_message_id ? `Tracking ${shortMessageId(trackedSend.meta_message_id)} every 5 seconds.` : latestSend?.meta_message_id ? `Showing ${shortMessageId(latestSend.meta_message_id)} from protected QA history.` : "No QA send has been recorded. The console will not send automatically."}</p></div></div>
          <ol className="qa-delivery-timeline">{timeline.map(([label, time]) => <li key={label} className={time ? "complete" : "pending"}><span>{time ? "✓" : "·"}</span><b>{label}</b><time>{formatTime(time)}</time></li>)}</ol>
          {latestSend?.status === "failed" && <p className="qa-inline-error">{latestSend.meta_error_message ?? "Meta reported delivery failure."}</p>}
        </section>
      </section>

      <section className="platform-lower-grid">
        <div className="panel qa-history-panel"><div className="panel-heading"><div><h2>Recent QA sends</h2><p>Isolated platform-admin history; tenant notifications are excluded.</p></div></div>{history.length ? <div className="qa-history-list">{history.map((item) => <article key={item.id ?? `${item.created_at}-${item.meta_message_id}`}><time>{formatTime(item.created_at)}</time><div><b>{item.template_name}</b><small>{item.recipient_masked} · {shortMessageId(item.meta_message_id)}</small></div><span className={`qa-status ${item.status}`}>{item.status}</span>{item.meta_error_code && <small>Code {item.meta_error_code}</small>}</article>)}</div> : <p className="qa-empty">No platform QA sends recorded yet.</p>}</div>
        <div className="panel qa-route-panel"><div className="panel-heading"><div><h2>CTA route diagnostics</h2><p>Diagnostics only. This console never repairs or deploys renewal routes.</p></div><button type="button" className="secondary-button" onClick={() => void loadRoutes()}>Refresh routes</button></div><div className="qa-route-list">{["/renewals?range=today", "/renewals?range=7d", "/renewals?range=30d"].map((path) => { const route = routes.find((item) => item.path === path); return <article key={path}><code>{path}</code><b className={route?.state ?? "unknown"}>{route?.label ?? "Unknown"}</b></article>; })}</div></div>
      </section>

      <section className="platform-inspector-grid" aria-label="Platform diagnostics">
        <section className="panel platform-config-panel" aria-labelledby="runtime-config-heading">
          <div className="panel-heading"><div><h2 id="runtime-config-heading">Runtime configuration</h2><p>Credential values remain server-side and are never displayed.</p></div></div>
          <ul className="whatsapp-env-status">
            {configKeys.map((key) => <li key={key}><span>{key}</span><b className={configuration?.[key] ? "configured" : "not-configured"}>{configuration ? (configuration[key] ? "Configured" : "Missing") : "Checking…"}</b></li>)}
          </ul>
        </section>

        <section className="panel platform-template-panel" aria-labelledby="template-inspection-heading">
          <div className="panel-heading"><div><h2 id="template-inspection-heading">Meta template inspector</h2><p>Read-only production Graph metadata with short-lived, no-store refreshes.</p></div><button type="button" className="secondary-button" onClick={() => void refreshTemplates()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh templates"}</button></div>
          <div className="platform-template-grid">
            {QA_TEMPLATE_NAMES.map((name) => {
              const template = inspection?.templates.find((item) => item.name === name);
              return <article key={name}><b>{name}</b><dl><div><dt>Status</dt><dd>{template?.status ?? "Not returned"}</dd></div><div><dt>Language</dt><dd>{template?.language ?? "Unresolved"}</dd></div><div><dt>Category</dt><dd>{template?.category ?? "—"}</dd></div></dl>{template?.buttons.map((button) => <small key={button.url}>{button.label}: {button.url}</small>)}<span className={templateReady(template) ? "qa-ready" : "qa-not-ready"}>{templateReady(template) ? "Ready to send" : "Not ready"}</span></article>;
            })}
          </div>
          {inspection?.error && <p className="qa-inline-error">{inspection.error.message}</p>}
        </section>
      </section>
    </>
  );
}
