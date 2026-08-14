# backend2

Production-oriented Express 5 + TypeScript + Zod 4 API with a layered venues architecture.

```text
HTTP -> security -> request ID -> logging -> routes -> Zod -> controller -> service -> repository -> storage
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

Migrations are discovered in filename order and tracked in `schema_migrations`, so each migration is applied once and failed migrations are rolled back.

Docker runs PostgreSQL, applies all pending migrations, and starts the API:

```bash
docker compose up --build
```

## API

```text
POST   /v1/venues
GET    /v1/venues?page=1&limit=20&search=hall&minCapacity=100&maxCapacity=5000&sortBy=capacity&order=desc
GET    /v1/venues/:id
PATCH  /v1/venues/:id
DELETE /v1/venues/:id
```

### Browser documentation

Open `http://localhost:3000/docs` for a lightweight interactive reference page, or `http://localhost:3000/openapi.json` for the machine-readable OpenAPI document.

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

### Search, sorting and pagination

- `page`: integer from `1` to `10000`.
- `limit`: integer from `1` to `100`.
- `search`: up to 100 characters; searches name and address.
- `sortBy`: `createdAt`, `name`, `address`, or `capacity`.
- `order`: `asc` or `desc`.
- Sorting uses an allowlist and never interpolates an arbitrary user-provided column.
- PostgreSQL includes trigram indexes for name/address search and indexes for common sort fields.

List responses include pagination metadata. Venue IDs are server-generated UUIDs. PostgreSQL enforces case-insensitive unique names and positive capacity.

## Operations

- `/health` liveness
- `/ready` storage readiness
- `/docs` browser API documentation
- `/openapi.json` OpenAPI document
- request IDs
- structured request logging
- Helmet
- CORS
- rate limiting with standard rate-limit headers and `Retry-After`
- centralized errors
- graceful database shutdown
- Docker deployment
- GitHub Actions quality gates

## Tests

Covers CRUD, UUIDs, pagination, search, minimum/maximum capacity filters, exact-capacity ranges, empty ranges, validation, input bounds, duplicates, missing resources, sorting and invalid query ranges.
