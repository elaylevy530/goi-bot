# GOI Bot Backend

NestJS API backed by TypeORM and PostgreSQL.

## Setup

Copy `.env.example` to `.env`, configure the PostgreSQL connection values and `JWT_SECRET`, then use the standard Nest scripts:

```bash
npm run start:dev
npm run build
npm run start:prod
```

Product authentication is handled by Nest JWT endpoints under `/api/auth`.

## Public marketing leads

`POST /api/public/partner-contact-lead` accepts `{ name, phone, message? }` from
the goi-partners contact form (no auth). Leads are persisted in
`partner_contact_leads` (separate from affiliate `partners`). Admin WhatsApp
notify is intentionally not wired here — `WhatsappModule` already imports
`PartnersModule`, so reuse would create a circular dependency. Include
`http://localhost:5176` in `CORS_ORIGINS` for local goi-partners (full product:
auth, jobs, chat, and the contact lead form).
