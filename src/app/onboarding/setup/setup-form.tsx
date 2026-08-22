"use client";

import { useActionState, useEffect, useState } from "react";
import { finishSetup, saveSetupStep } from "./actions";

export function SetupForm({ organization }: { organization: { name: string; location: string; email: string; phone: string; address: string; step: number } }) {
  const [step, setStep] = useState(Math.max(1, Math.min(4, organization.step)));
  const [state, action, pending] = useActionState(saveSetupStep, {});
  useEffect(() => { if (state.step) setStep(state.step); }, [state.step]);
  return <main className="auth"><section className="onboarding-setup"><p>Step {step} of 4</p><h1>Set up your Note It workspace</h1><p>Save each step to resume safely later. You can update every item from Settings.</p>
    {step === 1 && <form action={action}><input type="hidden" name="step" value="1"/><input name="name" defaultValue={organization.name} placeholder="Business name" required/><input name="location" defaultValue={organization.location} placeholder="Emirate / location" required/><input name="email" type="email" defaultValue={organization.email} placeholder="Business email"/><input name="phone" defaultValue={organization.phone} placeholder="Business phone"/><input name="address" defaultValue={organization.address} placeholder="Address"/><button disabled={pending}>Save and continue</button></form>}
    {step === 2 && <form action={action}><input type="hidden" name="step" value="2"/><h2>Add a first branch</h2><p>This is optional; you can add more branches later.</p><input name="branchName" placeholder="Branch name"/><input name="branchCity" defaultValue={organization.location} placeholder="City"/><input name="branchAddress" placeholder="Branch address"/><input name="branchPhone" placeholder="Branch phone"/><button disabled={pending}>Save and continue</button></form>}
    {step === 3 && <form action={action}><input type="hidden" name="step" value="3"/><h2>Workspace preferences</h2><select name="timezone" defaultValue="Asia/Dubai"><option value="Asia/Dubai">Asia/Dubai</option></select><select name="locale" defaultValue="en-AE"><option value="en-AE">English (UAE)</option></select><select name="currency" defaultValue="AED"><option value="AED">AED</option></select><button disabled={pending}>Save and continue</button></form>}
    {step === 4 && <form action={finishSetup}><h2>Already have customer data?</h2><p>Import your existing Excel or CSV records and we&apos;ll organize them for you. You can also add records manually or skip this step.</p><a className="button" href="/imports/new">Import Existing Data</a><button>I&apos;ll add them manually</button><button type="submit" className="secondary-button">Skip for now</button></form>}
    {state.error && <p role="alert">{state.error}</p>}</section></main>;
}
