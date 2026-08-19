"use client";

import React, { useActionState } from "react";
import {
  sendTestWhatsAppAction,
  updateWhatsAppSettingsAction,
  type WhatsAppSettingsActionState,
} from "@/features/settings/actions";

const initialState: WhatsAppSettingsActionState = {};

export function WhatsAppSettingsForm({
  settings,
  timezone,
}: {
  settings: {
    enabled: boolean;
    phone: string;
    time: string;
  };
  timezone: string;
}) {
  const [state, action, pending] = useActionState(updateWhatsAppSettingsAction, initialState);
  const [testState, testAction, testPending] = useActionState(sendTestWhatsAppAction, initialState);

  return <>
    <form action={action} className="whatsapp-settings-form">
      {state.success && <p className="settings-alert success" role="status">WhatsApp settings saved</p>}
      {state.error && <p className="settings-alert error" role="alert">{state.error}</p>}
      <label className="settings-toggle"><span><b>Enable WhatsApp expiry summary</b><small>One summary per workspace local day when documents need attention.</small></span><input type="checkbox" name="enabled" defaultChecked={settings.enabled} disabled={pending}/></label>
      <label><span>Recipient WhatsApp number</span><input name="phone" inputMode="tel" placeholder="+971501234567" defaultValue={settings.phone} disabled={pending}/><small>Use E.164 international format.</small></label>
      <label><span>Delivery time</span><input name="time" type="time" defaultValue={settings.time} disabled={pending}/></label>
      <label><span>Timezone</span><input value={timezone} readOnly/><small>This uses the workspace timezone to avoid conflicting schedules.</small></label>
      <button className="primary-button whatsapp-save-button" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Saving…" : "Save WhatsApp settings"}</button>
    </form>
    <form action={testAction} style={{ padding: "0 24px 24px" }}>
      {testState.success && <p className="settings-alert success" role="status">Test WhatsApp sent</p>}
      {testState.error && <p className="settings-alert error" role="alert">{testState.error}</p>}
      <button className="secondary-button" type="submit" disabled={testPending} aria-disabled={testPending} style={{ padding: "8px 12px", fontSize: "0.875rem" }}>{testPending ? "Sending…" : "Send test WhatsApp"}</button>
    </form>
  </>;
}
