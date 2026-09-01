create table if not exists case_preventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id uuid not null references regulatory_cases(id) on delete cascade,
  cause_category text not null check (cause_category in (
    'OPERATIONAL_FAILURE',
    'DOCUMENT_FAILURE',
    'PROCESS_FAILURE',
    'HUMAN_FAILURE',
    'SYSTEM_FAILURE',
    'THIRD_PARTY',
    'UNKNOWN'
  )),
  cause_description text not null,
  corrective_action text not null,
  prevention_plan text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_preventions_case on case_preventions(organization_id, case_id);
