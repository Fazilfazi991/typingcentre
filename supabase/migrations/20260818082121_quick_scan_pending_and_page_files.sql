-- Quick Scan: files/pages are distinct from document versions (which remain replacements).
alter table public.organization_document_types
  add column if not exists canonical_code text;

create unique index if not exists organization_document_types_canonical_code_unique
  on public.organization_document_types (organization_id, canonical_code)
  where canonical_code is not null;

create table public.pending_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid,
  company_id uuid,
  state text not null default 'uploaded' check (state in ('uploaded','classifying','classified','classification_failed','confirmed','abandoned')),
  detected_canonical_code text,
  detected_document_type_id uuid,
  extraction_data jsonb,
  created_by uuid references auth.users(id) on delete set null,
  confirmed_document_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, company_id) references public.companies(organization_id, id) on delete restrict,
  foreign key (organization_id, detected_document_type_id) references public.organization_document_types(organization_id, id) on delete restrict,
  foreign key (organization_id, confirmed_document_id) references public.documents(organization_id, id) on delete restrict,
  check (customer_id is not null or company_id is not null),
  check ((state = 'confirmed') = (confirmed_document_id is not null and confirmed_at is not null))
);

create table public.document_version_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_version_id uuid not null,
  object_key text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  page_order integer not null check (page_order >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (document_version_id, page_order),
  foreign key (organization_id, document_version_id) references public.document_versions(organization_id, id) on delete cascade
);
create index document_version_files_version_order_idx on public.document_version_files(document_version_id, page_order);
create index pending_scans_org_state_idx on public.pending_scans(organization_id, state, created_at desc);

create or replace function public.set_pending_scan_creator() returns trigger language plpgsql security definer set search_path = '' as $$
begin if (select auth.uid()) is null then raise exception 'Authentication is required'; end if; new.created_by := (select auth.uid()); return new; end; $$;
create trigger pending_scans_set_creator before insert on public.pending_scans for each row execute function public.set_pending_scan_creator();
revoke all on function public.set_pending_scan_creator() from public;

grant select, insert, update (state, detected_canonical_code, detected_document_type_id, extraction_data, confirmed_document_id, confirmed_at) on public.pending_scans to authenticated;
grant select, insert on public.document_version_files to authenticated;
alter table public.pending_scans enable row level security;
alter table public.document_version_files enable row level security;
create policy pending_scans_owner on public.pending_scans for all to authenticated using ((select security.is_organization_owner(organization_id))) with check ((select security.is_organization_owner(organization_id)));
create policy document_version_files_owner on public.document_version_files for all to authenticated using ((select security.is_organization_owner(organization_id))) with check ((select security.is_organization_owner(organization_id)));
