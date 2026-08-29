# Seguranca

Diretrizes:

- Autenticacao via JWT configurado por ambiente.
- Autorizacao por organizacao e RBAC no backend.
- Nunca confiar somente em filtros do frontend.
- Uploads devem validar MIME type, tamanho e hash.
- Auditoria e append-only para acoes criticas.
- CPF/documentos de motorista devem ser minimizados e mascarados quando possivel.
