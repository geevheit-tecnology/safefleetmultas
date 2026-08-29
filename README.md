# ANTT Control

ANTT Control e uma base SaaS web/mobile para gestao de risco regulatorio e prontuarios de autuacoes ANTT.

## Stack

- Frontend: Expo, React Native, TypeScript, React Native Web, Expo Router
- Backend: Kotlin, Ktor, Gradle, Coroutines
- Banco: PostgreSQL compativel com Neon
- Storage: S3 compativel para documentos
- Infra: Docker Compose e migrations versionadas

## Rodar o app

```sh
npm install
npm run web
```

O mesmo app Expo roda em web, Android e iOS.

## Rodar backend

```sh
cd backend/api
./gradlew run
```

Se nao houver Gradle/wrapper local, use Docker:

```sh
docker compose up api
```

## Escopo atual

Esta entrega cria a fundacao do MVP: app executivo responsivo, prontuarios, detalhe completo, entrada de novo auto, timeline, documentos, prazos, tarefas, legislacao, radar, inteligencia, administracao/RBAC, score regulatorio, mock de API e backend modular com regras centrais de workflow e risco.

Neon, S3 e IA estao preparados por interfaces/configuracao, sem fingir integracao real.

## Deploy

Veja `docs/deploy.md`. O frontend possui `apps/mobile/vercel.json` e espera `EXPO_PUBLIC_API_BASE_URL` quando o backend estiver publicado.

## Neon

Quando a `DATABASE_URL` do Neon estiver configurada:

```sh
npm run db:migrate
```
