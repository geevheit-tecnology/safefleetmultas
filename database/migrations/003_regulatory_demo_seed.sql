insert into legal_documents (
  title, number, year, type, issuing_authority, published_at, effective_from, status, official_url, source_hash
)
values
  ('Resolucao ANTT sobre CIOT', 'CIOT-DEMO', 2026, 'RESOLUTION', 'ANTT', '2026-01-10', '2026-01-10', 'NOT_VERIFIED', 'https://www.gov.br/antt/', 'demo-ciot-source'),
  ('Lei do Piso Minimo', 'PISO-DEMO', 2026, 'LAW', 'Governo Federal', '2026-01-15', '2026-01-15', 'NOT_VERIFIED', 'https://www.gov.br/antt/', 'demo-piso-source'),
  ('Normas de processo administrativo', 'PROCESSO-DEMO', 2026, 'STANDARD', 'ANTT', '2026-01-20', '2026-01-20', 'NOT_VERIFIED', 'https://www.gov.br/antt/', 'demo-processo-source')
on conflict do nothing;

insert into legal_versions (legal_document_id, version_label, effective_from, source_hash, content)
select id, 'demo-v1', effective_from, source_hash, 'Conteudo demo. Conferencia em fonte oficial obrigatoria antes de uso juridico.'
from legal_documents
where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
  and not exists (
    select 1 from legal_versions v where v.legal_document_id = legal_documents.id and v.version_label = 'demo-v1'
  );

insert into legal_sources (legal_document_id, source_type, official_url, fetched_at, source_hash)
select id, 'OFFICIAL_PORTAL', official_url, now(), source_hash
from legal_documents
where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
  and not exists (
    select 1 from legal_sources s where s.legal_document_id = legal_documents.id and s.source_hash = legal_documents.source_hash
  );

insert into regulatory_changes (legal_document_id, title, summary, impact_level, source_url)
select id, 'Tema CIOT com possivel impacto', 'Prontuarios de CIOT devem ser revisados por operador antes de conclusao.', 'HIGH', official_url
from legal_documents
where source_hash = 'demo-ciot-source'
  and not exists (select 1 from regulatory_changes where title = 'Tema CIOT com possivel impacto')
union all
select id, 'Tabela de piso minimo em monitoramento', 'Valor e vigencia precisam de confirmacao em fonte oficial.', 'MEDIUM', official_url
from legal_documents
where source_hash = 'demo-piso-source'
  and not exists (select 1 from regulatory_changes where title = 'Tabela de piso minimo em monitoramento')
union all
select id, 'Prazo processual em revisao', 'Sem fonte oficial confirmada neste ambiente.', 'NOT_VERIFIED', official_url
from legal_documents
where source_hash = 'demo-processo-source'
  and not exists (select 1 from regulatory_changes where title = 'Prazo processual em revisao');
