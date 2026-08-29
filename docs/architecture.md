# Arquitetura

O repositorio segue monorepo com `apps/mobile` para Expo/React Native Web, `backend/api` para Ktor e `database/migrations` para schema versionado. A pasta `apps/web` nao foi criada porque Expo Router e React Native Web entregam a superficie web no mesmo app, evitando duplicacao inicial.

Regras de negocio relevantes ficam no backend: workflow, risco, tenant isolation, prazos, documentos, auditoria e autorizacao. O frontend atual usa dados demo para prototipo navegavel.
