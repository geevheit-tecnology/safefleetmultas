begin;

delete from outbox_events
where organization_id = '00000000-0000-0000-0000-000000000001'
   or aggregate_id in (
     select id::text
     from regulatory_cases
     where source = 'DEMO'
        or infraction_number ilike '%DEMO%'
        or case_number between 'AC-2026-001' and 'AC-2026-010'
   );

delete from audit_logs
where organization_id = '00000000-0000-0000-0000-000000000001';

delete from regulatory_cases
where source = 'DEMO'
   or infraction_number ilike '%DEMO%'
   or case_number between 'AC-2026-001' and 'AC-2026-010';

delete from regulatory_changes
where legal_document_id in (
  select id from legal_documents where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
);

delete from legal_sources
where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source');

delete from legal_versions
where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
   or version_label = 'demo-v1';

delete from legal_documents
where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
   or number in ('CIOT-DEMO', 'PISO-DEMO', 'PROCESSO-DEMO');

delete from organization_members
where organization_id = '00000000-0000-0000-0000-000000000001'
   or user_id in (
     '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000000102',
     '00000000-0000-0000-0000-000000000103',
     '00000000-0000-0000-0000-000000000104',
     '00000000-0000-0000-0000-000000000105'
   );

delete from role_permissions
where role_id in (
  select id from roles where organization_id = '00000000-0000-0000-0000-000000000001'
);

delete from roles
where organization_id = '00000000-0000-0000-0000-000000000001';

delete from user_sessions
where user_id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105'
);

delete from user_credentials
where user_id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105'
);

delete from users
where id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105'
)
or email ilike '%@demo.local';

delete from organizations
where id = '00000000-0000-0000-0000-000000000001'
  and document = 'DEMO';

commit;
