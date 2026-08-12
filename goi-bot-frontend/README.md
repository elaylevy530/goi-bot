# goi-bot-frontend

TanStack Start (React + Vite + SSR) **product app** for GOI.

## What this app owns

- **Marketing landing** at `/` (Goi homepage)
- Admin (`/_authenticated/*`) including courier **management** (`/couriers-admin`, `/couriers/$id`, map, bank details, admin notifications)
- Business app (`/business/*`)
- **Courier ops** (`/courier/*`, `/courier-login`, `/courier-reset-password`) — Nest JWT, same API as Business
- Shared Nest JWT auth helpers (`src/lib/nest-auth.ts`)

Product surfaces: **courier / business / admin only**. Customer is not a first-class entry on the landing.

## Still on `goi-partners` (join / marketing)

Public movers + couriers join/registration. Ops login and the courier shell live in this app.

| Path | Owner |
| --- | --- |
| `/join`, `/r`, `/couriers` (marketing), `/drivers` | `goi-partners` (soft-redirect via `VITE_PARTNERS_URL`) |
| `/courier-login`, `/courier-reset-password`, `/courier/*` | **this app** |

## Related apps

| App | Role |
| --- | --- |
| [`goi-landing`](../goi-landing/) | Optional duplicate marketing / blog (landing primary is `/` here) |
| [`goi-hovalot`](../goi-hovalot/) | Customer moving app |
| [`goi-partners`](../goi-partners/) | Courier/mover join + marketing |

Configure:

```env
VITE_API_URL=http://localhost:3001
VITE_LANDING_URL=http://localhost:5175
VITE_PARTNERS_URL=http://localhost:5176
VITE_HOVALOT_URL=http://localhost:5174
```

Legacy SEO clones `/moving` and `/deliveries` remain here until consolidated.

**Product auth** uses Nest JWT via `src/lib/nest-auth.ts` (`apiFetch` → `/api/auth/*`).

See the monorepo [README](../README.md) and [API cutover plan](../docs/API_CUTOVER.md).
