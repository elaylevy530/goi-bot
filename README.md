# GOI Bot (monorepo)

Multi-frontend delivery platform with **one shared NestJS API** and PostgreSQL.

```
goi-bot/
├── goi-landing/        # Main marketing hub (Vite) — primary brand domain
├── goi-partners/       # Movers + couriers marketing / join (ops moved back to product shell)
├── goi-hovalot/        # Customer moving app (Vite)
├── goi-bot-frontend/   # Product shell: admin / business / customer / courier ops
├── goi-bot-backend/    # Shared NestJS API, webhooks, workers
└── docs/               # cutover / ops notes
```

## Domain map (intended)

| App | Role | Example domain | Local default |
| --- | --- | --- | --- |
| `goi-landing` | Marketing hub | `https://goi.example` | `:5175` |
| `goi-partners` | Movers + couriers marketing / join | `https://partners.goi.example` | `:5176` |
| `goi-hovalot` | Customer moving | `https://hovalot.goi.example` | `:5174` |
| `goi-bot-frontend` | Admin / business / customer / courier ops | app subdomain | `:5173` |
| `goi-bot-backend` | Shared API | API host | `:3001` |

**`goi-bot-frontend` owns:** admin, business, customer, and **courier ops** (`/courier-login`, `/courier-reset-password`, `/courier/*`) via Nest JWT.

**`goi-partners` keeps:** public marketing (`/`, `/drivers`) and join/registration (`/join`). Soft-redirects from the product shell remain for those marketing paths only.

Each frontend deploys separately. Frontends talk to Nest via `VITE_API_URL` where needed. Cross-app navigation uses **absolute env URLs** (`VITE_PARTNERS_URL`, `VITE_HOVALOT_URL`, `VITE_LANDING_URL`, `VITE_APP_URL`, …).

## Prerequisites

- Node.js ≥ 20
- npm
- PostgreSQL (managed via [pgAdmin](https://www.pgadmin.org/)) for Nest/TypeORM

## Local setup

### Shared API + product shell (workspaces)

```bash
npm install
cp goi-bot-backend/.env.example goi-bot-backend/.env
cp goi-bot-frontend/.env.example goi-bot-frontend/.env
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Nest base URL (e.g. `http://localhost:3001`) |
| `VITE_LANDING_URL` / `VITE_PARTNERS_URL` / `VITE_HOVALOT_URL` | Cross-app links from the product shell |
| `PORT` | Nest listen port (default `3001`) |
| `CORS_ORIGINS` | Comma-separated allowed origins (include all frontend ports you run) |
| `DB_*` / `JWT_*` | See [goi-bot-backend/README.md](goi-bot-backend/README.md) |

Never commit `.env` files or provider secrets.

Suggested local `CORS_ORIGINS`:

```text
http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:3000,http://localhost:8080
```

### Standalone frontends (install per app)

```bash
cd goi-landing && cp .env.example .env && npm install
cd ../goi-partners && cp .env.example .env && npm install
cd ../goi-hovalot && cp .env.example .env && npm install
```

### Run (separate terminals as needed)

```bash
npm run dev:backend
npm run dev:frontend          # product shell :5173
# from each app folder:
npm run dev                   # landing :5175 / partners :5176 / hovalot :5174
```

- Health: `GET http://localhost:3001/api/health`
- Product auth is Nest JWT + Postgres

## Architecture notes

- **Backend** stays shared: NestJS + TypeORM + PostgreSQL only. Do not split DB/schema per frontend.
- **Frontend apps** are UI/product splits only.
- TanStack `createServerFn` handlers in `goi-bot-frontend` still proxy to Nest where an SSR boundary is required.
- Cutover tracking: [docs/API_CUTOVER.md](docs/API_CUTOVER.md)

## Migration status

| Phase | Status |
| --- | --- |
| 0 — Folder split + Nest scaffold | Done |
| 1 — Nest auth guards, CORS, health, TypeORM/Postgres | Done |
| Marketing multi-frontend split (landing + partners) | Done (phase 1) |
| Full partners product extraction (ops + auth) | Done |
| 2 — Webhooks / workers / public track | Not started |
| 3 — Domain APIs (jobs, guest orders, …) | Not started |
| 4 — Remove migrated TanStack server code | Not started |
