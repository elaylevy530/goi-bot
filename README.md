# GOI Bot (monorepo)

Delivery platform split into a TanStack Start UI and a NestJS API.

```
goi-bot/
├── goi-bot-frontend/   # TanStack Start / React UI (+ transitional server fns)
├── goi-bot-backend/    # NestJS API, webhooks, workers
└── docs/               # cutover / ops notes
```

## Prerequisites

- Node.js ≥ 20
- npm (workspaces)
- PostgreSQL (managed via [pgAdmin](https://www.pgadmin.org/)) for Nest/TypeORM

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment

**Frontend** — copy `goi-bot-frontend/.env.example` → `goi-bot-frontend/.env`

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Nest base URL (e.g. `http://localhost:3001`) |

**Backend** — copy `goi-bot-backend/.env.example` → `goi-bot-backend/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | Nest listen port (default `3001`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `DB_HOST` | Postgres host (pgAdmin “Host name/address”) |
| `DB_PORT` | Postgres port (default `5432`) |
| `DB_USERNAME` | Postgres user |
| `DB_PASSWORD` | Postgres password |
| `DB_NAME` | Database name created in pgAdmin |
| `DB_SYNCHRONIZE` | `true` — TypeORM creates/updates schema from entities (no migrations) |
| `JWT_SECRET` | Secret for Nest JWT signing/verification |
| `JWT_EXPIRES_IN` | Optional token lifetime (default `7d`) |

Never commit `.env` files or provider secrets.

### pgAdmin ↔ Nest DB

Create an empty database in pgAdmin, then use the same connection values in `goi-bot-backend/.env`. Details: [goi-bot-backend/README.md](goi-bot-backend/README.md). Schema is applied on Nest boot via TypeORM `synchronize` — do not add TypeORM migrations.

| pgAdmin field | Backend env var |
| --- | --- |
| Host name/address | `DB_HOST` |
| Port | `DB_PORT` |
| Username | `DB_USERNAME` |
| Password | `DB_PASSWORD` |
| Database | `DB_NAME` |

### 3. Run (two terminals)

```bash
npm run dev:backend
npm run dev:frontend
```

- Health: `GET http://localhost:3001/api/health`
- **Product auth** is Nest JWT + Postgres: `/auth`, `/admin-login`, `/signup-business` → `nest-auth.ts` → `/api/auth/*`
- Also: `POST /api/auth/register/customer`, `POST /api/auth/register/business`, `GET /api/auth/me`
- Frontend may call Nest via `VITE_API_URL` or Vite proxy (`/api/health`, `/api/auth` only — not all `/api/*`)

## Architecture notes

- **Backend** uses NestJS + TypeORM + PostgreSQL only. Product auth is Nest JWT (Passport).
- **Frontend product session** is Nest JWT (`goi_nest_access_token`) and all API data flows through Nest.
- TanStack `createServerFn` handlers proxy to Nest where an SSR boundary is required.
- Cutover tracking + manual smoke steps: [docs/API_CUTOVER.md](docs/API_CUTOVER.md)

## Migration status

| Phase | Status |
| --- | --- |
| 0 — Folder split + Nest scaffold | Done |
| 1 — Nest auth guards, CORS, health, TypeORM/Postgres | Done |
| 2 — Webhooks / workers / public track | Not started |
| 3 — Domain APIs (jobs, guest orders, …) | Not started |
| 4 — Remove migrated TanStack server code | Not started |
