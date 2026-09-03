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
