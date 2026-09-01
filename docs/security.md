# Seguranca

Diretrizes:

- Autenticacao via JWT configurado por ambiente.
- Autorizacao por organizacao e RBAC no backend.
- Nunca confiar somente em filtros do frontend.
- Uploads devem validar MIME type, tamanho e hash.
- Preview aceita PDF/JPEG/PNG/WebP, limite de 15MB por documento e hash SHA-256.
- API aplica limite simples por IP/janela e limite de corpo por variavel de ambiente.
- Auditoria e append-only para acoes criticas.
- Eventos criticos preparados em `event_outbox` para publicacao assíncrona futura.
- CPF/documentos de motorista devem ser minimizados e mascarados quando possivel.
