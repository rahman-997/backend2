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
```

Local verification:

```bash
npm run verify
```

`verify` runs TypeScript typechecking, a production build, and the Vitest suite.

## PostgreSQL

PostgreSQL is the canonical production database. Set `STORAGE=postgres` and `DATABASE_URL`, then run:

```bash
npm run db:migrate
npm run db:contract
```

Migrations are discovered in filename order and tracked in `schema_migrations`, so each migration is applied once and failed migrations are rolled back. `db:contract` inspects the real PostgreSQL catalog and verifies the expected `venues` columns, UUID/defaults, positive-capacity constraint, case-insensitive unique-name index, and core indexes.

Docker runs PostgreSQL, applies all pending migrations, and starts the API:

```bash
docker compose up --build
```

## Database and schema tooling

SQL migrations are the source of truth for production schema changes.

- PostgreSQL + SQL migrations: canonical production storage/schema.
- Zod: API request/query validation.
- Prisma: schema representation, validation, and generated client tooling.
- Drizzle: schema representation and Drizzle Kit checks.
- TypeORM: entity metadata validation with synchronization disabled.
- MySQL: reference/equivalent schema only; it is not the active production adapter.

The ORM packages are development/tooling dependencies, so the production Docker image does not carry unused ORM runtimes. CI runs a cross-ORM smoke test that writes with Prisma, reads with Drizzle, updates with TypeORM, verifies the update with Prisma, and deletes with Drizzle against the same PostgreSQL table.

See `docs/DATABASE-ARCHITECTURE.md` for the database ownership rules. Multiple ORMs are not allowed to mutate the production schema independently.

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
- lean production Docker runtime
- GitHub Actions quality gates
- guarded PostgreSQL backup/restore scripts
- Dependabot for npm and GitHub Actions updates
- documented security policy

Backup and restore:

```bash
npm run db:backup
# destructive restore requires CONFIRM_RESTORE=yes
npm run db:restore -- backups/backend2-<timestamp>.dump
```

See `docs/BACKUP-RESTORE.md`, `docs/PRODUCTION-CHECKLIST.md`, and `SECURITY.md` before production deployment.

## Tests and CI

Unit/integration tests cover CRUD, UUIDs, pagination, search, minimum/maximum capacity filters, exact-capacity ranges, empty ranges, validation, input bounds, duplicates, missing resources, sorting and invalid query ranges.

CI additionally runs:

```text
PostgreSQL service
  -> SQL migrations
  -> canonical DB contract validation
  -> Prisma validation/generation
  -> Drizzle schema check
  -> TypeORM metadata validation
  -> cross-ORM interoperability smoke test
  -> typecheck
  -> production build
  -> Vitest
  -> compiled-server E2E smoke test
  -> dependency audit
  -> Docker build
  -> production Docker runtime readiness smoke test
```

The compiled-server E2E test verifies health/readiness, create, case-insensitive duplicate conflict, filtered min/max listing, get, update, delete, and post-delete 404 behavior. The Docker runtime smoke test then starts the actual production image with development dependencies omitted and requires `/ready` to succeed against PostgreSQL.
