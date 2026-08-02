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
