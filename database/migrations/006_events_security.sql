create table if not exists event_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_outbox_pending on event_outbox(created_at)
where published_at is null;

create index if not exists idx_audit_logs_org_created on audit_logs(organization_id, created_at desc);
create index if not exists idx_documents_case_created on case_documents(organization_id, case_id, created_at desc);
create index if not exists idx_actions_org_status_due on case_actions(organization_id, status, due_date);
create index if not exists idx_legal_versions_effective on legal_versions(legal_document_id, effective_from, effective_until);
create unique index if not exists ux_document_versions_document_version on document_versions(document_id, version);

alter table case_documents
  add constraint case_documents_allowed_mime
  check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')) not valid;

alter table case_documents
  add constraint case_documents_size_limit
  check (size_bytes between 0 and 15728640) not valid;
