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

FASE 15 esta parcial: arquitetura/documentacao de IA existe, fluxo de upload/OCR esta preparado e endpoints de IA foram protegidos para preview publico. Ainda nao existe provedor real de IA nem extracao real validada por confirmacao humana.

FASE 17 esta parcial: typecheck, smoke tests e validacoes API por preview foram executados. Ainda faltam suites completas de API, banco, autorizacao, deadline, audit e integracao backend Ktor.

FASE 18 esta parcial/completa para preview: Vercel preview publico e Neon estao funcionando. Docker existe como requisito de arquitetura, mas backend Ktor ainda nao foi validado em runtime completo neste ambiente.

## Status por secoes funcionais

- [x] Secao #10 - Documentos: metadados, versao, storage key e auditoria no Neon.
- [x] Secao #11 - Upload Inteligente: OCR mock seguro com extracao pendente, confirmacao humana e auditoria no Neon.
- [~] Secao #12 - IA: interface `MockAiProvider`, tela de inteligencia, resumo preventivo seguro e escrita de analises bloqueada por token; falta provedor real.
- [x] Secao #13 - Regra de seguranca da IA: guard bloqueia promessa/decisao juridica definitiva e exige referencia de fonte em analises.
- [x] Secao #14 - Legislacao: biblioteca versionada com norma, vigencia, fonte oficial, hash e contagem de versoes.
- [x] Secao #15 - Regra vigente na data: endpoint e tela consultam versoes por periodo de vigencia da ocorrencia.
- [x] Secao #16 - Radar Regulatorio: lista mudancas regulatórias priorizando fonte oficial vinculada.
- [x] Secao #17 - Impact Analysis: radar calcula tema, casos relacionados e potencialmente afetados como analise de apoio.
- [x] Secao #18 - Motor de Risco: `RiskEngine` server-side centraliza thresholds/pesos, calcula score 0-100, classifica nivel e persiste fatores.
- [x] Secao #19 - Reincidencia: sugestoes `POSSIBLE_REPETITION`/`RELATED_CASE` por tema/infracao/empresa exigem validacao humana e nao afirmam reincidencia juridica.
- [x] Secao #20 - Motor de Prazos: prazos possuem inicio, base legal, duracao, status e alerta 15/7/3/1/vencido com validacao humana.
- [x] Secao #21 - Central de Acoes: prontuario permite criar acoes com prioridade, prazo, responsavel/status e conclusao rastreada.
- [x] Secao #22 - Alta Regulatoria: fechamento `CLOSED` e bloqueado ate checklist real de alta estar completo e responsavel confirmar.
- [x] Secao #23 - Dashboard Executivo: central executiva exibe risco regulatorio, exposicao, criticos, tratamento, prazos, encerrados, tendencias e alteracoes legislativas.
- [x] Secao #24 - Dashboard Operacional: tela de tarefas exibe minha fila, acoes de hoje, prazos criticos, documentos pendentes e casos aguardando decisao/documentos.
- [x] Secao #25 - Indice de Maturidade Regulatoria: `RegulatoryScoreEngine` calcula score interno 0-100 por prazos, documentacao, CIOT, piso minimo, processos, reincidencia e prevencao, sem certificacao oficial.
- [x] Secao #26 - Prevencao: analise de causa padronizada relaciona multa, causa, acao corretiva e plano preventivo como aprendizado operacional.
- [x] Secao #27 - Notificacoes: `NotificationEngine` prepara tipos do prompt e canais in-app, push, e-mail e WhatsApp futuro sem envio externo no preview.
- [x] Secao #28 - Auditoria: `audit_logs` recebe registros append-only com action/entity/old/new sanitizados, IP e user-agent, sem payload sensivel desnecessario.
