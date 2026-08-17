"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Owner = { id: string; name: string; companyName?: string | null };

export function DocumentOwnerPicker({ customers, companies }: { customers: Owner[]; companies: Owner[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"customer" | "company">("customer");
  const [ownerId, setOwnerId] = useState("");
  const options = kind === "customer" ? customers : companies;

  function continueToUpload() {
    if (!ownerId) return;
    const parameter = kind === "customer" ? "customerId" : "companyId";
    router.push(`/documents/upload?${parameter}=${encodeURIComponent(ownerId)}`);
  }

  return <section className="panel smart-upload">
    <p className="eyebrow">Add document</p>
    <h1>Choose the document owner</h1>
    <p>Select the customer or company first. The secure upload flow will then store the file privately, read it automatically, and present editable values for confirmation.</p>
    <div className="record-form">
      <fieldset>
        <legend>Owner</legend>
        <label>Belongs to
          <select value={kind} onChange={(event) => { setKind(event.target.value as "customer" | "company"); setOwnerId(""); }}>
            <option value="customer">Customer</option>
            <option value="company">Company</option>
          </select>
        </label>
        <label>{kind === "customer" ? "Customer" : "Company"}
          <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required>
            <option value="">Select {kind === "customer" ? "a customer" : "a company"}</option>
            {options.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}{owner.companyName ? ` · ${owner.companyName}` : ""}</option>)}
          </select>
        </label>
      </fieldset>
      <div className="actions"><button className="primary-button" type="button" disabled={!ownerId} onClick={continueToUpload}>Continue to secure upload</button></div>
    </div>
  </section>;
}
