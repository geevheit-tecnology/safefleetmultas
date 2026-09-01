insert into regulatory_cases (
  id, organization_id, case_number, infraction_number, category, subcategory,
  description, event_date, received_at, amount, status, risk_score, risk_level,
  vehicle_plate, rntrc, authority, responsible_user_id, source
)
values
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000001', 'AC-2026-007', 'AI-DEMO-007/2026', 'Vale Pedagio', 'Comprovante ausente', 'Ocorrencia ficticia DEMO sem documento real de terceiro.', '2026-08-01', '2026-08-03', 2100.00, 'TRIAGE', 34, 'MEDIUM', 'DEM0A07', '70000007', 'ANTT', '00000000-0000-0000-0000-000000000102', 'DEMO'),
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000001', 'AC-2026-008', 'AI-DEMO-008/2026', 'RNTRC', 'Cadastro vencido', 'Ocorrencia ficticia DEMO para teste de prazo e RBAC.', '2026-08-04', '2026-08-05', 890.00, 'ANALYSIS', 41, 'MEDIUM', 'DEM0A08', '70000008', 'ANTT', '00000000-0000-0000-0000-000000000103', 'DEMO'),
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000001', 'AC-2026-009', 'AI-DEMO-009/2026', 'Documentacao', 'MDF-e divergente', 'Ocorrencia ficticia DEMO para checklist documental.', '2026-08-06', '2026-08-07', 4300.00, 'WAITING_DOCUMENTS', 58, 'HIGH', 'DEM0A09', '70000009', 'ANTT', '00000000-0000-0000-0000-000000000102', 'DEMO'),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000001', 'AC-2026-010', 'AI-DEMO-010/2026', 'CIOT', 'Divergencia de emissao', 'Ocorrencia ficticia DEMO para reincidencia operacional.', '2026-08-08', '2026-08-09', 12600.00, 'ACTION_REQUIRED', 91, 'CRITICAL', 'DEM0A10', '70000010', 'ANTT', '00000000-0000-0000-0000-000000000103', 'DEMO')
on conflict do nothing;

insert into case_deadlines (id, organization_id, case_id, deadline_type, start_event, legal_basis, duration, due_date, status, responsible_user_id)
values
  ('00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000307', 'Validar notificacao', 'RECEIVED', 'DEMO NOT_VERIFIED', 10, '2026-09-10', 'PENDING', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000508', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000308', 'Conferir cadastro RNTRC', 'TRIAGE', 'DEMO NOT_VERIFIED', 7, '2026-09-08', 'PENDING', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000509', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000309', 'Anexar MDF-e', 'WAITING_DOCUMENTS', 'DEMO NOT_VERIFIED', 3, '2026-09-04', 'PENDING', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000510', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000310', 'Preparar defesa CIOT', 'ACTION_REQUIRED', 'DEMO NOT_VERIFIED', 5, '2026-09-06', 'PENDING', '00000000-0000-0000-0000-000000000103')
on conflict do nothing;

insert into case_actions (id, organization_id, case_id, title, priority, status, responsible_user_id, due_date)
values
  ('00000000-0000-0000-0000-000000000607', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000307', 'Conferir comprovante ficticio de vale pedagio', 'MEDIUM', 'PENDING', '00000000-0000-0000-0000-000000000102', '2026-09-09'),
  ('00000000-0000-0000-0000-000000000608', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000308', 'Validar cadastro RNTRC demo', 'MEDIUM', 'IN_PROGRESS', '00000000-0000-0000-0000-000000000103', '2026-09-08'),
  ('00000000-0000-0000-0000-000000000609', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000309', 'Solicitar documento ficticio', 'HIGH', 'PENDING', '00000000-0000-0000-0000-000000000102', '2026-09-04'),
  ('00000000-0000-0000-0000-000000000610', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000310', 'Revisar recorrencia CIOT demo', 'HIGH', 'PENDING', '00000000-0000-0000-0000-000000000103', '2026-09-05')
on conflict do nothing;

insert into case_documents (id, organization_id, case_id, name, document_type, mime_type, size_bytes, sha256, storage_key, uploaded_by)
values
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000307', 'documento-demo-vale-pedagio.pdf', 'DEMO_DOCUMENT', 'application/pdf', 1024, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa7', 'demo/cases/ac-2026-007/documento.pdf', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000310', 'documento-demo-ciot.pdf', 'DEMO_DOCUMENT', 'application/pdf', 2048, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa10', 'demo/cases/ac-2026-010/documento.pdf', '00000000-0000-0000-0000-000000000103')
on conflict do nothing;

insert into document_versions (organization_id, document_id, version, storage_key, sha256)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000407', 1, 'demo/cases/ac-2026-007/documento.pdf', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa7'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000410', 1, 'demo/cases/ac-2026-010/documento.pdf', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa10')
on conflict do nothing;

insert into case_events (id, organization_id, case_id, action, description, user_id)
values
  ('00000000-0000-0000-0000-000000000707', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000307', 'CASE_CREATED', 'Evento DEMO criado para seed inicial.', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000708', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000308', 'CASE_CREATED', 'Evento DEMO criado para seed inicial.', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000709', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000309', 'DOCUMENT_REQUIRED', 'Evento DEMO para documento ficticio pendente.', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000710', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000310', 'RISK_CHANGED', 'Evento DEMO para risco critico de CIOT.', '00000000-0000-0000-0000-000000000103')
on conflict do nothing;

update regulatory_cases
set source = 'DEMO'
where organization_id = '00000000-0000-0000-0000-000000000001'
  and case_number between 'AC-2026-001' and 'AC-2026-010';
