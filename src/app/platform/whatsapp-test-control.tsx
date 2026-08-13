"use client";

import { FormEvent, useEffect, useState } from "react";

const defaultMessage =
  "Note It WhatsApp integration test. If you received this message, the production WhatsApp Cloud API connection is working.";

type ConfigurationStatus = Record<
  | "WHATSAPP_ACCESS_TOKEN"
  | "WHATSAPP_PHONE_NUMBER_ID"
  | "WHATSAPP_BUSINESS_ACCOUNT_ID"
  | "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  boolean
>;
type SendResponse = {
  success: boolean;
  messageId?: string;
  responseStatus?: number;
  error?: { code?: number; message?: string; requiresTemplate?: boolean };
};
const keys: Array<keyof ConfigurationStatus> = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
];

export function WhatsAppTestControl() {
  const [configuration, setConfiguration] = useState<ConfigurationStatus | null>(null);
  const [recipient, setRecipient] = useState("");
  const [sendKind, setSendKind] = useState<"text" | "template">("text");
  const [message, setMessage] = useState(defaultMessage);
  const [result, setResult] = useState<SendResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/whatsapp/test", { cache: "no-store" })
      .then(async (response) => {
        if (response.ok)
          setConfiguration(
            ((await response.json()) as { configuration: ConfigurationStatus }).configuration,
          );
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sendKind === "template"
            ? { kind: "template", recipient, templateName: "hello_world", languageCode: "en_US" }
            : { kind: "text", recipient, message },
        ),
      });
      setResult((await response.json()) as SendResponse);
    } catch {
      setResult({
        success: false,
        error: { message: "The protected WhatsApp test endpoint could not be reached." },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel whatsapp-test-control" aria-labelledby="whatsapp-test-heading">
      <div className="panel-heading">
        <div>
          <h2 id="whatsapp-test-heading">WhatsApp production test</h2>
          <p>Platform admins only. This sends only after you submit.</p>
        </div>
      </div>
      <div className="whatsapp-test-content">
        <h3>Protected runtime configuration</h3>
        <ul className="whatsapp-env-status" aria-label="WhatsApp configuration status">
          {keys.map((key) => (
            <li key={key}>
              <span>{key}</span>
              <b className={configuration?.[key] ? "configured" : "not-configured"}>
                {configuration ? (configuration[key] ? "Configured" : "Missing") : "Checking…"}
              </b>
            </li>
          ))}
        </ul>
        <form className="record-form" onSubmit={submit}>
          <label>
            Approved recipient (E.164)
            <input
              required
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="+971501234567"
              pattern="\+[0-9]{8,15}"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
          <label>
            Send type
            <select
              value={sendKind}
              onChange={(event) => setSendKind(event.target.value as "text" | "template")}
            >
              <option value="text">Free-form test message</option>
              <option value="template">hello_world — English (US)</option>
            </select>
          </label>
          {sendKind === "text" ? (
            <label>
              Test message
              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={500}
                rows={3}
              />
            </label>
          ) : (
            <p>Active Meta template: hello_world (en_US). No parameters.</p>
          )}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading
              ? "Sending controlled test…"
              : sendKind === "template"
                ? "Send one template test"
                : "Send one test message"}
          </button>
        </form>
        {result && (
          <div
            className={result.success ? "whatsapp-result success" : "whatsapp-result error"}
            role="status"
          >
            {result.success ? (
              <p>
                Meta accepted the request
                {result.messageId ? ` (message ID: ${result.messageId})` : ""}.
              </p>
            ) : (
              <>
                <p>{result.error?.message ?? "WhatsApp test send failed."}</p>
                {result.error?.code !== undefined && <p>Meta error code: {result.error.code}</p>}
                {result.error?.requiresTemplate && (
                  <p>A Meta-approved template is required outside the customer-service window.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
