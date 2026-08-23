"use client";

import React, { useActionState } from "react";
import { TimezoneCombobox } from "@/components/timezone-combobox";
import {
  sendTestWhatsAppAction,
  updateWhatsAppSettingsAction,
  type WhatsAppSettingsActionState,
} from "@/features/settings/actions";

const initialState: WhatsAppSettingsActionState = {};

export function WhatsAppSettingsForm({
  settings,
  timezone,
  dailyStatus,
}: {
  settings: {
    enabled: boolean;
    phone: string;
    time: string;
  };
  timezone: string;
  dailyStatus: {
    message: string;
    nextScheduledDelivery: string | null;
    sentToday: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateWhatsAppSettingsAction, initialState);
  const [testState, testAction, testPending] = useActionState(sendTestWhatsAppAction, initialState);

  return (
    <>
      <form action={action} className="whatsapp-settings-form">
        {state.success && (
          <p className="settings-alert success" role="status">
            WhatsApp settings saved
          </p>
        )}
        {state.error && (
          <p className="settings-alert error" role="alert">
            {state.error}
          </p>
        )}
        <label className="settings-toggle">
          <span>
            <b>Enable WhatsApp expiry summary</b>
            <small>One summary per workspace local day when documents need attention.</small>
          </span>
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            disabled={pending}
          />
        </label>
        <label>
          <span>Recipient WhatsApp number</span>
          <input
            name="phone"
            inputMode="tel"
            placeholder="+971501234567"
            defaultValue={settings.phone}
            disabled={pending}
          />
          <small>Use E.164 international format.</small>
        </label>
        <label>
          <span>Delivery time</span>
          <input name="time" type="time" defaultValue={settings.time} disabled={pending} />
        </label>
        <div className="whatsapp-daily-status" role="status">
          <b>
            {dailyStatus.sentToday
              ? "Today’s expiry summary has already been sent."
              : "Automatic daily summary"}
          </b>
          <p>{dailyStatus.message}</p>
          {dailyStatus.nextScheduledDelivery && <small>{dailyStatus.nextScheduledDelivery}</small>}
        </div>
        <label>
          <span>Timezone</span>
          <TimezoneCombobox value={timezone} disabled={pending} />
          <small>Used for scheduled WhatsApp notifications and workspace-local dates.</small>
        </label>
        <div className="whatsapp-settings-actions">
          <button
            className="primary-button whatsapp-save-button"
            type="submit"
            disabled={pending}
            aria-disabled={pending}
          >
            {pending ? "Saving…" : "Save WhatsApp settings"}
          </button>
        </div>
      </form>
      <form action={testAction} className="whatsapp-test-form">
        <div className="whatsapp-test-action-row">
          <button
            className="secondary-button whatsapp-test-button"
            type="submit"
            disabled={testPending}
            aria-disabled={testPending}
          >
            {testPending ? "Sending…" : "Send test WhatsApp"}
          </button>
          <small>
            Sends an immediate test message without affecting today’s scheduled summary.
          </small>
        </div>
        <div className="whatsapp-test-result" aria-live="polite">
          {testState.success && (
            <p className="whatsapp-test-notice success" role="status">
              ✓ Test WhatsApp sent
            </p>
          )}
          {testState.error && (
            <p className="whatsapp-test-notice error" role="alert">
              {testState.error}
            </p>
          )}
        </div>
      </form>
    </>
  );
}
