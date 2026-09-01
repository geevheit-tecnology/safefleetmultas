insert into users (id, email, name)
values
  ('00000000-0000-0000-0000-000000000104', 'admin@demo.local', 'Admin Demo'),
  ('00000000-0000-0000-0000-000000000105', 'diretor@demo.local', 'Diretor Demo')
on conflict do nothing;

insert into permissions (code, description)
values
  ('cases.read', 'Ler prontuarios'),
  ('cases.create', 'Criar prontuarios'),
  ('cases.update', 'Atualizar prontuarios'),
  ('cases.close', 'Encerrar prontuarios'),
  ('documents.read', 'Ler documentos'),
  ('documents.upload', 'Enviar documentos'),
  ('legislation.read', 'Ler legislacao'),
  ('legislation.manage', 'Gerenciar legislacao'),
  ('risk.read', 'Ler risco'),
  ('risk.manage', 'Gerenciar risco'),
  ('reports.read', 'Ler relatorios'),
  ('audit.read', 'Ler auditoria'),
  ('users.manage', 'Gerenciar usuarios')
on conflict (code) do update set description = excluded.description;

insert into roles (id, organization_id, code, name)
values
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'ADMIN', 'Admin'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'DIRECTOR', 'Diretor')
on conflict do nothing;

insert into organization_members (organization_id, user_id, role_id)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000204'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000205')
on conflict do nothing;

delete from role_permissions
where role_id in (
  select id from roles where organization_id = '00000000-0000-0000-0000-000000000001'
);

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code = any (
  case r.code
    when 'PRESIDENT' then array['reports.read','risk.read','audit.read']
    when 'DIRECTOR' then array['cases.read','cases.update','documents.read','legislation.read','risk.read','reports.read','audit.read']
    when 'OPERATOR' then array['cases.read','cases.create','cases.update','documents.read','documents.upload']
    when 'LEGAL' then array['cases.read','cases.update','cases.close','documents.read','documents.upload','legislation.read','risk.read','risk.manage']
    when 'ADMIN' then array['cases.read','cases.create','cases.update','cases.close','documents.read','documents.upload','legislation.read','legislation.manage','risk.read','risk.manage','reports.read','audit.read','users.manage']
    else array[]::text[]
  end
)
where r.organization_id = '00000000-0000-0000-0000-000000000001'
on conflict do nothing;
