-- Human-reviewed AI extraction metadata. Original document bytes remain only in private R2.
create type public.document_extraction_status as enum (
  'uploaded', 'processing', 'review_required', 'confirmed', 'failed'
);

alter table public.documents
  add column extraction_status public.document_extraction_status not null default 'uploaded',
  add column extraction_provider text,
  add column extraction_model text,
  add column extracted_at timestamptz,
  add column extraction_attempts integer not null default 0 check (extraction_attempts >= 0),
  add column extraction_confidence jsonb not null default '{}'::jsonb,
  add column extraction_warnings jsonb not null default '[]'::jsonb,
  add column extraction_data jsonb not null default '{}'::jsonb;

create index documents_organization_extraction_status_idx
  on public.documents (organization_id, extraction_status)
  where archived_at is null;

grant update (
  document_type_id, customer_id, company_id, branch_id, document_number, display_name,
  issued_on, expires_on, status, reminder_thresholds, notes, archived_at,
  extraction_status, extraction_provider, extraction_model, extracted_at,
  extraction_attempts, extraction_confidence, extraction_warnings, extraction_data
) on public.documents to authenticated;

comment on column public.documents.extraction_data is
  'Structured AI result only; never contains original document binary.';
