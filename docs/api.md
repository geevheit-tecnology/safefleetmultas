# API

Base path: `/api/v1`.

Header multiempresa:

- `X-Organization-Id`: identifica a organizacao da requisicao enquanto a autenticacao JWT/RBAC completa nao esta ativa.

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
