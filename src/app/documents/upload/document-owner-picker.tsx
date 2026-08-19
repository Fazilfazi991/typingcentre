"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchableOwnerCombobox } from "@/components/searchable-owner-combobox";

export function DocumentOwnerPicker() {
  const router = useRouter();
  const [kind, setKind] = useState<"customer" | "company">("customer");
  const [ownerId, setOwnerId] = useState("");

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
          <SearchableOwnerCombobox kind={kind} name="ownerId" value={ownerId} onChange={(value) => setOwnerId(value)} />
        </label>
      </fieldset>
      <div className="actions"><button className="primary-button" type="button" disabled={!ownerId} onClick={continueToUpload}>Continue to secure upload</button></div>
    </div>
  </section>;
}
