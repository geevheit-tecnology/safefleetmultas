# API

Base path: `/api/v1`.

Header multiempresa:

- `X-Organization-Id`: identifica a organizacao da requisicao enquanto a autenticacao JWT/RBAC completa nao esta ativa.
- `X-User-Id`: identifica o usuario demo para enforcement RBAC no preview.

- `GET /health`
- `GET /api/v1/dashboard`
- `GET /api/v1/cases`
- `GET /api/v1/cases/{id}`
- `GET /api/v1/cases/{id}/timeline`
- `GET /api/v1/cases/{id}/documents`
- `POST /api/v1/cases/{id}/documents`
- `GET /api/v1/cases/{id}/deadlines`
- `GET /api/v1/cases/{id}/actions`
- `POST /api/v1/cases/{id}/actions`
- `GET /api/v1/legislation`
- `GET /api/v1/radar`
- `GET /api/v1/notifications`
- `GET /api/v1/audit`

Endpoints ainda nao implementados devem retornar contrato documentado antes de integracao real.

Contratos REST consolidados no preview:

- `/api/v1/cases/{id}` e sub-recursos usam rewrite para `/api/v1/case` para manter o limite de functions da Vercel.
- `/api/v1/legislation`, `/api/v1/radar`, `/api/v1/notifications` e `/api/v1/audit` usam aliases versionados para os modulos atuais.
- Mutacoes retornam JSON e registram `case_events`, `audit_logs` e, quando aplicavel, `event_outbox`.
