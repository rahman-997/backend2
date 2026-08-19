# backend2

Production-oriented Express 5 + TypeScript + Zod 4 API with layered venue management, multi-database persistence, authentication, refresh-token rotation, and role-based access control.

```text
HTTP -> security -> request ID -> logging -> routes -> Zod -> controller -> service -> repository -> storage
                                                                                 |-> Memory
                                                                                 |-> PostgreSQL
                                                                                 |-> MySQL
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

## Authentication and RBAC

Authentication uses signed JWT access tokens and opaque rotating refresh tokens.

```text
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/auth/me
GET  /v1/auth/admin/users   ADMIN only
```

Passwords are hashed with Node.js `scrypt`; plaintext passwords are never stored. Refresh tokens are stored only as SHA-256 hashes and are revoked on rotation/logout.

Production requires a secret of at least 32 characters:

```text
JWT_SECRET=<strong-random-secret>
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
```

An optional `BOOTSTRAP_ADMIN_EMAIL` promotes only a matching registration to the `ADMIN` role. Leave it unset unless an initial administrator is intentionally being bootstrapped.

Use an access token with:

```text
Authorization: Bearer <access-token>
```

## Storage adapters

The application supports three runtime storage modes:

```text
STORAGE=memory
STORAGE=postgres
STORAGE=mysql
```

### PostgreSQL

PostgreSQL remains the default production target and the database used by Prisma/Drizzle/TypeORM compatibility tooling.

```bash
STORAGE=postgres \
DATABASE_URL=postgresql://backend2:backend2@localhost:5432/backend2 \
npm run db:migrate

npm run db:contract
```

PostgreSQL migrations live in `migrations/`, are applied in filename order, and are tracked in `schema_migrations`.

### MySQL

MySQL 8.4 is a first-class runtime persistence adapter.

```bash
STORAGE=mysql \
MYSQL_URL=mysql://backend2:backend2@localhost:3307/backend2 \
npm run db:migrate

npm run db:contract:mysql
```

MySQL migrations live in `schema/mysql/`, are applied in filename order, and are tracked in MySQL's own `schema_migrations` table.

Both SQL backends support venues, users, refresh tokens, positive venue capacity, and case-insensitive uniqueness where required.

## Docker

Docker Compose runs two complete API/database stacks from the same application image:

```text
http://localhost:3000
API (STORAGE=postgres)
        |
        +-- PostgreSQL 17

http://localhost:3001
API (STORAGE=mysql)
        |
        +-- MySQL 8.4
```

Start everything with:

```bash
docker compose up --build
```

The production image runs the dialect-appropriate migrations before starting the server. For production-mode containers, supply `JWT_SECRET`.

MySQL is also exposed directly on the host for database tools:

```text
Host: localhost
Port: 3307
Database: backend2
User: backend2
Password: backend2
```

PostgreSQL and MySQL use separate persistent Docker volumes.

## Database and schema tooling

- PostgreSQL + SQL migrations: default production database and canonical ORM compatibility target.
- MySQL 8.4 + MySQL migrations: supported production/runtime database adapter.
- Zod: API request/query validation.
- Prisma: PostgreSQL schema representation, validation, generated client tooling.
- Drizzle: PostgreSQL schema representation and Drizzle Kit checks.
- TypeORM: PostgreSQL entity metadata validation with synchronization disabled.

The ORM packages are development/tooling dependencies; the production image carries only runtime dependencies such as Express, Zod, `pg`, `mysql2`, and `jose`.

CI runs a cross-ORM smoke test against PostgreSQL and independent runtime/E2E tests against both PostgreSQL and MySQL. See `docs/DATABASE-ARCHITECTURE.md` for database ownership rules.

## Venue API

```text
POST   /v1/venues
GET    /v1/venues?page=1&limit=20&search=hall&minCapacity=100&maxCapacity=5000&sortBy=capacity&order=desc
GET    /v1/venues/:id
PATCH  /v1/venues/:id
DELETE /v1/venues/:id
```

The HTTP contract is storage-independent: the same routes, validation, error contract, filtering, sorting, and pagination are used for memory, PostgreSQL, and MySQL.

### Browser documentation

Open `http://localhost:3000/docs` for the PostgreSQL-backed stack or `http://localhost:3001/docs` for the MySQL-backed stack. Machine-readable OpenAPI is available at `/openapi.json` on either API.

The public deployment is available at `https://backend2-api.onrender.com` with documentation at `/docs`.

### Capacity filtering

`minCapacity` and `maxCapacity` are optional, non-negative integers.

- `minCapacity` means `capacity >= minCapacity`.
- `maxCapacity` means `capacity <= maxCapacity`.
- Both boundaries are inclusive.
- `minCapacity=maxCapacity` performs an exact-capacity match.
- `minCapacity > maxCapacity` is rejected with HTTP `400`.
- Negative and fractional capacity filters are rejected with HTTP `400`.
- No matches returns HTTP `200` with an empty `data` array and pagination metadata showing `total: 0`.

### Search, sorting and pagination

- `page`: integer from `1` to `10000`.
- `limit`: integer from `1` to `100`.
- `search`: up to 100 characters; searches name and address.
- `sortBy`: `createdAt`, `name`, `address`, or `capacity`.
- `order`: `asc` or `desc`.
- Sorting uses an allowlist and never interpolates an arbitrary user-provided column.

List responses include pagination metadata. Venue IDs are server-generated UUIDs.

## Operations

- `/health` liveness
- `/ready` selected-storage readiness
- request IDs
- structured request logging
- Helmet
- CORS
- rate limiting with standard headers and `Retry-After`
- centralized error handling
- JWT access authentication
- rotating/revocable refresh tokens
- `USER` / `ADMIN` RBAC
- graceful PostgreSQL/MySQL pool shutdown
- migrations before container startup
- Docker deployment
- GitHub Actions quality gates
- PostgreSQL and MySQL backup/restore scripts
- Dependabot
- documented security policy

### PostgreSQL backup / restore

```bash
npm run db:backup
CONFIRM_RESTORE=yes npm run db:restore -- backups/backend2-<timestamp>.dump
```

### MySQL backup / restore

```bash
npm run db:backup:mysql
CONFIRM_RESTORE=yes npm run db:restore:mysql -- backups/backend2-mysql-<timestamp>.sql
```

See `docs/BACKUP-RESTORE.md`, `docs/PRODUCTION-CHECKLIST.md`, and `SECURITY.md` before production deployment.

## Tests and CI

Unit/integration tests cover CRUD, UUIDs, pagination, search, capacity filtering, validation, duplicates, missing resources, sorting, readiness, error contracts, registration, login, JWT authentication, refresh rotation, logout, and RBAC.

CI additionally runs:

```text
PostgreSQL 17 + MySQL 8.4 services
  -> PostgreSQL migrations + contract validation
  -> Prisma validation/generation
  -> Drizzle schema check
  -> TypeORM metadata validation
  -> cross-ORM PostgreSQL interoperability smoke test
  -> MySQL migrations + contract validation
  -> typecheck
  -> production build
  -> Vitest
  -> PostgreSQL compiled API E2E (venues + auth)
  -> MySQL compiled API E2E (venues + auth)
  -> dependency audit
  -> Docker build
  -> PostgreSQL production-image readiness smoke test
  -> MySQL production-image readiness smoke test
```

The compiled E2E scenario verifies health/readiness, registration, login, authenticated profile, refresh-token rotation/reuse rejection, logout/revocation, venue CRUD, case-insensitive duplicate conflict, filtering, and post-delete `404` against both SQL adapters.
