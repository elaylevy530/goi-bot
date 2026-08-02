# API Architecture

GOI uses NestJS, TypeORM, and PostgreSQL for all product API, webhook, worker, and authentication flows.

The TanStack frontend uses the Vite proxy for `/api/*` routes and server functions call Nest with the current JWT where an SSR boundary is needed.
