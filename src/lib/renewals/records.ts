type Relation<T> = T | T[] | null | undefined;

export const RENEWAL_RECORD_SELECT = "id,organization_id,display_name,document_number,issued_on,expires_on,status,archived_at,customer_id,company_id,branch_id,customers(id,full_name,phone,whatsapp_number,status,is_active,archived_at),companies(id,name,contact_phone,whatsapp_number,status,is_active,archived_at),branches(name,status,is_active,archived_at),organization_document_types(name,is_active)";

export const RENEWAL_WORKFLOW_RECORD_SELECT = `${RENEWAL_RECORD_SELECT},renewals!renewals_organization_id_document_id_fkey(id,status,started_at,completed_at,created_at,replacement_document_id),follow_ups(id,status,due_at)`;

export function oneRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value;
}

function isActive(record: { is_active?: boolean; status?: string; archived_at?: string | null } | null | undefined) {
  return Boolean(
    record &&
      record.is_active !== false &&
      record.status !== "removed" &&
      record.status !== "suspended" &&
      !record.archived_at,
  );
}

/** Keeps dashboard, email, WhatsApp and renewals aligned on which records require attention. */
export function isRelevantExpiryRecord(row: {
  is_active?: boolean;
  status?: string;
  archived_at?: string | null;
  customers?: Relation<{ is_active?: boolean; status?: string; archived_at?: string | null }>;
  companies?: Relation<{ is_active?: boolean; status?: string; archived_at?: string | null }>;
  branches?: Relation<{ is_active?: boolean; status?: string; archived_at?: string | null }>;
  organization_document_types?: Relation<{ is_active?: boolean; status?: string; archived_at?: string | null }>;
}) {
  const customer = oneRelation(row.customers);
  const company = oneRelation(row.companies);
  const branch = oneRelation(row.branches);
  const type = oneRelation(row.organization_document_types);
  return (
    isActive(row) &&
    isActive(type) &&
    (!customer || isActive(customer)) &&
    (!company || isActive(company)) &&
    (!branch || isActive(branch))
  );
}
