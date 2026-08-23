"use client";

import Link from "next/link";
import { useActionState } from "react";
import { provisionTypingCentre, type ProvisioningResult } from "@/app/admin/actions";

const initialState: ProvisioningResult = {};

export function TypingCentreProvisionForm() {
  const [state, action, pending] = useActionState(provisionTypingCentre, initialState);

  if (state.organizationId) {
    return <section className="admin-panel"><h2>Typing Centre created</h2><dl><dt>Owner</dt><dd>{state.ownerEmail}</dd><dt>Status</dt><dd>Active</dd><dt>Email</dt><dd>Confirmed</dd></dl><div className="admin-actions"><Link className="primary-button" href={`/admin/typing-centres/${state.organizationId}`}>Open Typing Centre</Link><Link href="/admin/typing-centres">Back to Typing Centres</Link></div></section>;
  }

  return <form action={action} className="admin-form admin-panel"><fieldset><legend>Business</legend><label>Typing centre name<input required name="name" /></label><label>Business / legal name<input name="legalName" /></label><label>Business email<input required type="email" name="email" /></label><label>Contact phone<input required name="phone" /></label><label>WhatsApp number<input name="whatsapp" placeholder="+971..." /></label><label>Address<input name="address" /></label><label>City / Emirate<input required name="location" /></label><label>Country<input name="country" defaultValue="United Arab Emirates" /></label></fieldset><fieldset><legend>Owner</legend><label>Owner / admin name<input required name="ownerName" /></label><label>Owner mobile<input required name="ownerMobile" /></label><label>Initial password<input required name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" /></label><label>Confirm password<input required name="confirmPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" /></label></fieldset><fieldset><legend>Note It Subscription</legend><label><input type="radio" name="billing" value="monthly" defaultChecked /> Monthly — AED 100 / month</label><label><input type="radio" name="billing" value="annual" /> Annual — AED 1,000 / 13 months · Save AED 300</label><span>Renewal / expiry is calculated automatically from today.</span><label>Account status<select name="state" defaultValue="trial"><option value="trial">Trial</option><option value="active">Active</option><option value="paused">Paused</option><option value="suspended">Suspended</option></select></label></fieldset>{state.error && <p className="auth-error" role="alert">{state.error}</p>}<button className="primary-button" disabled={pending}>{pending ? "Creating…" : "Create Typing Centre"}</button></form>;
}
