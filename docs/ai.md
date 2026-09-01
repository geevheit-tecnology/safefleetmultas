# IA

A IA sera acessada por uma interface `AiProvider`.

Implementacoes iniciais:

- `MockAiProvider` para desenvolvimento.
- Provedores reais somente com secrets via ambiente.

Analises devem usar linguagem de apoio, citar fonte e nunca se apresentar como decisao juridica definitiva.

Antes de retornar conteudo do provider, `assertSafeAiAnalysis` bloqueia frases de resultado juridico definitivo e exige `sourceReference`.

## Implementacao atual

No preview atual, a camada de IA esta representada por um provider mock isolado em `apps/mobile/api/_aiProvider.js`.

Recursos implementados:

- OCR preparado da Secao #11 grava `ai_extractions` com `PENDING_CONFIRMATION`.
- Confirmacao humana altera a extracao para `CONFIRMED`.
- Analise executiva de apoio grava `ai_analyses`.
- Inteligencia preventiva consolidada usa agregados internos de `regulatory_cases`.
- Guard de seguranca impede frases como promessa de ganho de recurso e exige referencia de fonte.

Limites intencionais:

- Nao existe chamada para provedor externo de IA.
- Nenhum dado critico extraido e aplicado automaticamente.
- Nenhuma resposta deve afirmar resultado juridico, reincidencia juridica ou chance de ganhar recurso.
