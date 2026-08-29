create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  code text not null,
  name text not null,
  unique (organization_id, code)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create type case_status as enum ('RECEIVED','TRIAGE','ANALYSIS','ACTION_REQUIRED','IN_TREATMENT','WAITING_DOCUMENTS','WAITING_EXTERNAL','DECISION','APPEAL','FINALIZATION','CLOSED');
create type risk_level as enum ('LOW','MEDIUM','HIGH','CRITICAL');

create table regulatory_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_number text not null,
  infraction_number text,
  process_number text,
  category text not null,
  subcategory text,
  description text,
  event_date date,
  received_at date,
  amount numeric(14,2),
  status case_status not null default 'RECEIVED',
  severity text,
  risk_score int not null default 0 check (risk_score between 0 and 100),
  risk_level risk_level not null default 'LOW',
  vehicle_plate text,
  driver_name text,
  driver_document text,
  rntrc text,
  location text,
  authority text not null default 'ANTT',
  responsible_user_id uuid references users(id),
  source text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, case_number)
);

create table case_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  old_status case_status,
  new_status case_status not null,
  changed_by uuid references users(id),
  reason text,
  created_at timestamptz not null default now()
);

create table case_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  action text not null,
  description text,
  user_id uuid references users(id),
  document_id uuid,
  created_at timestamptz not null default now()
);

create table case_deadlines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  deadline_type text not null,
  start_event text,
  legal_basis text not null default 'NOT_VERIFIED',
  duration int,
  due_date date not null,
  status text not null check (status in ('PENDING','COMPLETED','EXPIRED','CANCELLED')),
  responsible_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table case_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  title text not null,
  priority text not null check (priority in ('HIGH','MEDIUM','LOW')),
  status text not null check (status in ('PENDING','IN_PROGRESS','DONE','CANCELLED')),
  responsible_user_id uuid references users(id),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table case_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  name text not null,
  document_type text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  storage_key text not null,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  document_id uuid not null references case_documents(id) on delete cascade,
  version int not null,
  storage_key text not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table case_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  body text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table case_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  decision_type text not null,
  decision_date date,
  final_amount numeric(14,2),
  document_id uuid references case_documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table case_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_case_id uuid not null references regulatory_cases(id) on delete cascade,
  target_case_id uuid not null references regulatory_cases(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('POSSIBLE_REPETITION','RELATED_CASE')),
  validated_by uuid references users(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  check (source_case_id <> target_case_id)
);

create table legal_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  number text,
  year int,
  type text not null,
  issuing_authority text not null,
  published_at date,
  effective_from date,
  effective_until date,
  status text not null,
  official_url text,
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table legal_versions (
  id uuid primary key default gen_random_uuid(),
  legal_document_id uuid not null references legal_documents(id) on delete cascade,
  version_label text not null,
  effective_from date,
  effective_until date,
  source_hash text,
  content text,
  created_at timestamptz not null default now()
);

create table legal_articles (
  id uuid primary key default gen_random_uuid(),
  legal_version_id uuid not null references legal_versions(id) on delete cascade,
  article_number text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table legal_sources (
  id uuid primary key default gen_random_uuid(),
  legal_document_id uuid not null references legal_documents(id) on delete cascade,
  source_type text not null,
  official_url text not null,
  fetched_at timestamptz,
  source_hash text,
  created_at timestamptz not null default now()
);

create table regulatory_changes (
  id uuid primary key default gen_random_uuid(),
  legal_document_id uuid references legal_documents(id),
  title text not null,
  summary text,
  impact_level text not null check (impact_level in ('HIGH','MEDIUM','LOW','NOT_VERIFIED')),
  source_url text,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table risk_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  score int not null check (score between 0 and 100),
  level risk_level not null,
  explanation text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table risk_factors (
  id uuid primary key default gen_random_uuid(),
  risk_assessment_id uuid not null references risk_assessments(id) on delete cascade,
  factor text not null,
  weight numeric(8,2) not null,
  value text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id),
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table ai_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid references regulatory_cases(id) on delete cascade,
  document_id uuid references case_documents(id) on delete cascade,
  provider text not null,
  status text not null,
  extracted_data jsonb not null default '{}'::jsonb,
  confirmed_by uuid references users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  provider text not null,
  analysis_type text not null,
  content text not null,
  source_reference text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_id uuid references users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_cases_org_status on regulatory_cases(organization_id, status);
create index idx_cases_org_risk on regulatory_cases(organization_id, risk_level, risk_score);
create index idx_deadlines_org_due on case_deadlines(organization_id, due_date, status);
create index idx_events_case_created on case_events(case_id, created_at);
