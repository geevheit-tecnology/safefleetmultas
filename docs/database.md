# Banco de Dados

O schema inicial esta em `database/migrations/001_initial_schema.sql`.

Todas as tabelas de dados operacionais possuem `organization_id` para isolamento multiempresa. Documentos guardam somente metadados e `storage_key`; arquivos ficam em storage S3 compativel.
