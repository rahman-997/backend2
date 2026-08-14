# backend2

Production-oriented Express 5 + TypeScript + Zod 4 API with a layered venues architecture.

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

Set `STORAGE=postgres` and `DATABASE_URL`, then run:

```bash
npm run db:migrate
```

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

### Capacity filtering

`minCapacity` and `maxCapacity` are optional, non-negative integers.

- `minCapacity` means `capacity >= minCapacity`.
- `maxCapacity` means `capacity <= maxCapacity`.
- Both boundaries are inclusive.
- `minCapacity=maxCapacity` is supported and performs an exact-capacity match.
- `minCapacity > maxCapacity` is rejected with HTTP `400`.
- Negative and fractional capacity filters are rejected with HTTP `400`.
- If no venue matches the range, the API returns HTTP `200` with an empty `data` array and pagination metadata showing `total: 0`.

Examples:

```text
GET /v1/venues?minCapacity=500
GET /v1/venues?maxCapacity=1000
GET /v1/venues?minCapacity=500&maxCapacity=1000
GET /v1/venues?minCapacity=750&maxCapacity=750
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

Covers CRUD, UUIDs, pagination, search, minimum/maximum capacity filters, exact-capacity ranges, empty ranges, validation, duplicates, missing resources and invalid query ranges.
