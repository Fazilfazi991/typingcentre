"use client";

import { useActionState, useEffect, useState } from "react";
import { finishSetup, saveSetupStep } from "./actions";

export function SetupForm({ organization }: { organization: { name: string; location: string; email: string; phone: string; address: string; step: number } }) {
  const [step, setStep] = useState(Math.max(2, Math.min(3, organization.step)));
  const [state, action, pending] = useActionState(saveSetupStep, {});
  useEffect(() => { if (state.step) setStep(state.step); }, [state.step]);
  return <div className="onboarding-setup"><ol className="onboarding-progress" aria-label="Onboarding progress"><li className="complete">Workspace</li><li className={step === 2 ? "active" : "complete"}>Business details</li><li className={step === 3 ? "active" : ""}>Ready</li></ol>
    {step === 2 && <><div className="auth-intro"><p>Step 2 of 3</p><h1>Confirm your business details</h1><span>Only contact information is optional. Everything remains editable in Settings.</span></div><form action={action} className="auth-form"><input type="hidden" name="step" value="2"/><label>Typing centre name<input name="name" defaultValue={organization.name} required/></label><label>Emirate<input name="location" defaultValue={organization.location} required/></label><label>Business email <span>(optional)</span><input name="email" type="email" defaultValue={organization.email}/></label><label>Business phone <span>(optional)</span><input name="phone" inputMode="tel" defaultValue={organization.phone}/></label><label>Address <span>(optional)</span><input name="address" defaultValue={organization.address}/></label><button className="auth-submit" disabled={pending}>{pending ? "Saving..." : "Save and continue"}</button></form></>}
    {step === 3 && <><div className="auth-intro"><p>Step 3 of 3</p><h1>Your workspace is ready</h1><span>Start with one customer, then upload the document you want Note It to track.</span></div><form action={finishSetup} className="onboarding-ready"><button className="auth-submit" name="next" value="dashboard">Go to Dashboard</button><button className="secondary-button" name="next" value="import">Import CSV/XLSX instead</button><small>Import is optional and can be used later.</small></form></>}
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}</div>;
}
