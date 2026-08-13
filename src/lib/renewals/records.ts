type Relation<T> = T | T[] | null | undefined;

export const RENEWAL_RECORD_SELECT = "id,organization_id,display_name,document_number,expires_on,status,archived_at,customer_id,company_id,branch_id,customers(full_name,status,is_active,archived_at),companies(name,status,is_active,archived_at),branches(name,status,is_active,archived_at),organization_document_types(name,is_active)";

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
