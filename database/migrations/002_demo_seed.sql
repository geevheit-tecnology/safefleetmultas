insert into organizations (id, name, document)
values ('00000000-0000-0000-0000-000000000001', 'Transportadora Demo', 'DEMO')
on conflict do nothing;

insert into users (id, email, name)
values
  ('00000000-0000-0000-0000-000000000101', 'presidente@demo.local', 'Presidente Demo'),
  ('00000000-0000-0000-0000-000000000102', 'operador@demo.local', 'Operador Demo'),
  ('00000000-0000-0000-0000-000000000103', 'juridico@demo.local', 'Juridico Demo')
on conflict do nothing;

insert into permissions (code, description)
values
  ('cases.read', 'Ler prontuarios'),
  ('cases.create', 'Criar prontuarios'),
  ('cases.update', 'Atualizar prontuarios'),
  ('cases.close', 'Encerrar prontuarios'),
  ('documents.upload', 'Enviar documentos'),
  ('legislation.read', 'Ler legislacao'),
  ('audit.read', 'Ler auditoria'),
  ('users.manage', 'Gerenciar usuarios')
on conflict do nothing;

insert into roles (id, organization_id, code, name)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'PRESIDENT', 'Presidente'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'OPERATOR', 'Operador'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'LEGAL', 'Juridico')
on conflict do nothing;

insert into organization_members (organization_id, user_id, role_id)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000203')
on conflict do nothing;

insert into regulatory_cases (
  id, organization_id, case_number, infraction_number, category, subcategory,
  description, event_date, received_at, amount, status, risk_score, risk_level,
  vehicle_plate, rntrc, authority, responsible_user_id, source
)
values
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000001',
    'AC-2026-001',
    'AI-DEMO-001/2026',
    'CIOT',
    'Ausencia de CIOT',
    'Caso demo com legislacao e prazo marcados como NOT_VERIFIED ate validacao humana.',
    '2026-08-12',
    '2026-08-14',
    5500.00,
    'ACTION_REQUIRED',
    82,
    'CRITICAL',
    'ABC-1D23',
    '01234567',
    'ANTT',
    '00000000-0000-0000-0000-000000000102',
    'DEMO'
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000001',
    'AC-2026-002',
    'AI-DEMO-002/2026',
    'Piso Minimo',
    'Valor abaixo do piso',
    'Caso demo para tratamento operacional. Tabela aplicavel deve ser confirmada em fonte oficial.',
    '2026-07-28',
    '2026-07-30',
    10500.00,
    'IN_TREATMENT',
    65,
    'HIGH',
    'XYZ-9W01',
    null,
    'ANTT',
    '00000000-0000-0000-0000-000000000103',
    'DEMO'
  )
on conflict do nothing;

insert into case_events (organization_id, case_id, action, description, user_id)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'CASE_CREATED', 'Prontuario demo criado.', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'RISK_CHANGED', 'Score demo 82/100 gerado como analise de apoio.', null);

insert into case_deadlines (organization_id, case_id, deadline_type, legal_basis, due_date, status, responsible_user_id)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'Validar prazo de defesa', 'NOT_VERIFIED', '2026-09-03', 'PENDING', '00000000-0000-0000-0000-000000000102');
