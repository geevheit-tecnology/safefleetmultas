# Checklist splitt002 - ANTT Control

Este checklist segue a numeracao real do `splitt002`, secao `# 49. PRIMEIRA ENTREGA`.

## Fases

- [x] FASE 1 - Analisar requisitos
- [x] FASE 2 - Criar arquitetura
- [x] FASE 3 - Criar estrutura do monorepo
- [x] FASE 4 - Criar banco Neon e migrations
- [x] FASE 5 - Criar backend Ktor
- [~] FASE 6 - Criar autenticacao/RBAC
- [x] FASE 7 - Criar dominio Regulatory Case
- [x] FASE 8 - Criar timeline/eventos
- [x] FASE 9 - Criar documentos
- [x] FASE 10 - Criar prazos
- [x] FASE 11 - Criar Risk Engine
- [x] FASE 12 - Criar frontend
- [x] FASE 13 - Criar dashboard
- [x] FASE 14 - Criar legislacao
- [~] FASE 15 - Criar IA
- [x] FASE 16 - Criar Radar
- [~] FASE 17 - Testes completos
- [x] FASE 18 - Docker/deploy

## Observacoes de status

FASE 6 esta parcial: RBAC e estrutura de permissoes existem no banco e Admin consulta dados mascarados do Neon. Falta autenticacao real com provedor externo e enforcement completo por usuario autenticado.

FASE 15 esta parcial: arquitetura/documentacao de IA existe e o fluxo de upload/OCR esta preparado, mas ainda nao existe provedor real de IA nem extracao real validada por confirmacao humana.

FASE 17 esta parcial: typecheck, smoke tests e validacoes API por preview foram executados. Ainda faltam suites completas de API, banco, autorizacao, deadline, audit e integracao backend Ktor.

FASE 18 esta parcial/completa para preview: Vercel preview publico e Neon estao funcionando. Docker existe como requisito de arquitetura, mas backend Ktor ainda nao foi validado em runtime completo neste ambiente.

## Status por secoes funcionais

- [x] Secao #10 - Documentos: metadados, versao, storage key e auditoria no Neon.
- [x] Secao #11 - Upload Inteligente: OCR mock seguro com extracao pendente, confirmacao humana e auditoria no Neon.
- [~] Secao #12 - IA: interface conceitual/documentada e fluxo seguro preparado; falta provedor real.
