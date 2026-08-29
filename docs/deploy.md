# Deploy

## Frontend Vercel

Projeto: `apps/mobile`.

Variavel principal:

- `EXPO_PUBLIC_API_BASE_URL`: URL publica do backend Ktor.

Build:

```sh
npx expo export --platform web --clear
```

Output: `dist`.

## Backend

O backend Ktor usa:

- `DATABASE_URL`: Neon PostgreSQL.
- `JWT_SECRET`: segredo JWT.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`: storage de documentos.
- `AI_PROVIDER`: `mock` ate configurar provedor real.

As migrations em `database/migrations` devem ser aplicadas no Neon antes de apontar `DATABASE_URL` para producao.

Aplicacao das migrations:

```sh
npm run db:migrate
```

## Status atual

O frontend esta pronto para Vercel preview. O backend esta preparado para Neon via JDBC, mas ainda precisa de credenciais reais e ambiente de hospedagem Java/Ktor.
