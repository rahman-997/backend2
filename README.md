# backend2

Production-oriented Express 5 + TypeScript + Zod 4 API with layered venues architecture.

```text
HTTP -> security -> routes -> Zod -> controller -> service -> repository -> storage
                                                                  |-> Map
                                                                  |-> PostgreSQL
```

## Run

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm test
```

## PostgreSQL

Set `STORAGE=postgres` and `DATABASE_URL`, then run `npm run db:migrate`.

Docker runs PostgreSQL, applies the migration, and starts the API:

```bash
docker compose up --build
```

## API

```text
POST   /v1/venues
GET    /v1/venues?page=1&limit=20&search=hall&minCapacity=100&maxCapacity=5000
GET    /v1/venues/:id
PATCH  /v1/venues/:id
DELETE /v1/venues/:id
```

List responses include pagination metadata. Venue IDs are server-generated UUIDs. PostgreSQL enforces case-insensitive unique names and positive capacity.

## Operations

- `/health` liveness
- `/ready` storage readiness
- `/openapi.json` OpenAPI document
- request IDs
- Helmet
- CORS
- rate limiting
- centralized errors
- graceful database shutdown
- Docker deployment
- GitHub Actions quality gates

## Tests

Covers CRUD, UUIDs, pagination, search, capacity filters, validation, duplicates, missing resources and invalid query ranges.
