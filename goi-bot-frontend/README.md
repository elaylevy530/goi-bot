# goi-bot-frontend

TanStack Start (React + Vite + SSR) UI for GOI.

**Product auth** uses Nest JWT via `src/lib/nest-auth.ts` (`apiFetch` → `/api/auth/*`).

During the Nest migration this package still hosts transitional `createServerFn` handlers and `src/routes/api/**` for non-auth domains. Prefer `src/lib/api-client.ts` for endpoints already moved to Nest.

See the monorepo [README](../README.md) and [API cutover plan](../docs/API_CUTOVER.md).
