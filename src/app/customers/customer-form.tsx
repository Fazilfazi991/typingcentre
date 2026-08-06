"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

type CompanyOption = {
  id: string;
  name: string;
};

type BranchOption = {
  id: string;
  name: string;
  company_id: string;
};

type CustomerFormValues = {
  id?: string;
  full_name?: string;
  customer_type?: string;
  phone?: string;
  nationality?: string | null;
  passport_number?: string | null;
  emirates_id_number?: string | null;
  email?: string | null;
  whatsapp_number?: string | null;
  company_id?: string | null;
  branch_id?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  residential_address?: string | null;
  sponsor_name?: string | null;
  sponsor_company?: string | null;
  visa_type?: string | null;
  profession?: string | null;
  notes?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button" disabled={pending} aria-disabled={pending}>
      {pending ? "Saving..." : label}
    </button>
  );
}

export function CustomerForm({
  action,
  customer,
  companies,
  branches,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customer?: CustomerFormValues;
  companies: CompanyOption[];
  branches: BranchOption[];
  submitLabel: string;
}) {
  const [companyId, setCompanyId] = useState(customer?.company_id ?? "");
  const [branchId, setBranchId] = useState(customer?.branch_id ?? "");
  const filteredBranches = useMemo(
    () => branches.filter((branch) => branch.company_id === companyId),
    [branches, companyId],
  );

  return (
    <form action={action} className="record-form">
      {customer?.id && <input type="hidden" name="customerId" value={customer.id} />}
      <fieldset>
        <legend>Identity and contact</legend>
        <label>
          Full name *
          <input name="fullName" defaultValue={customer?.full_name ?? ""} required />
        </label>
        <label>
          Customer type *
          <select name="customerType" defaultValue={customer?.customer_type ?? "individual"}>
            <option value="individual">Individual</option>
            <option value="employee">Employee</option>
            <option value="dependent">Dependent</option>
            <option value="corporate_contact">Corporate contact</option>
          </select>
        </label>
        <label>
          Mobile *
          <input name="phone" inputMode="tel" defaultValue={customer?.phone ?? ""} required />
        </label>
        <label>
          Nationality
          <input name="nationality" defaultValue={customer?.nationality ?? ""} />
        </label>
        <label>
          Passport number
          <input name="passportNumber" defaultValue={customer?.passport_number ?? ""} />
        </label>
        <label>
          Emirates ID
          <input name="emiratesIdNumber" defaultValue={customer?.emirates_id_number ?? ""} />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={customer?.email ?? ""} />
        </label>
        <label>
          WhatsApp
          <input name="whatsappNumber" inputMode="tel" defaultValue={customer?.whatsapp_number ?? ""} />
        </label>
        <label>
          Date of birth
          <input name="dateOfBirth" type="date" defaultValue={customer?.date_of_birth ?? ""} />
        </label>
        <label>
          Gender
          <select name="gender" defaultValue={customer?.gender ?? ""}>
            <option value="">Not recorded</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label className="wide">
          Residential address
          <textarea name="residentialAddress" rows={3} defaultValue={customer?.residential_address ?? ""} />
        </label>
      </fieldset>
      <fieldset>
        <legend>Company relationship</legend>
        <label>
          Company
          <select
            name="companyId"
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              setBranchId("");
            }}
          >
            <option value="">Independent</option>
            {companies.map((company) => (
              <option value={company.id} key={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Branch
          <select
            name="branchId"
            value={branchId}
            disabled={!companyId}
            aria-describedby="branch-help"
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">No branch</option>
            {filteredBranches.map((branch) => (
              <option value={branch.id} key={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <span id="branch-help" className="field-help">
            Select a company first to choose a branch.
          </span>
        </label>
        <label>
          Sponsor name
          <input name="sponsorName" defaultValue={customer?.sponsor_name ?? ""} />
        </label>
        <label>
          Sponsor company
          <input name="sponsorCompany" defaultValue={customer?.sponsor_company ?? ""} />
        </label>
        <label>
          Visa type
          <input name="visaType" defaultValue={customer?.visa_type ?? ""} />
        </label>
        <label>
          Profession
          <input name="profession" defaultValue={customer?.profession ?? ""} />
        </label>
        <label className="wide">
          Notes
          <textarea name="notes" rows={4} defaultValue={customer?.notes ?? ""} />
        </label>
      </fieldset>
      <SubmitButton label={submitLabel} />
    </form>
  );
}
