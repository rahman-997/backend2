# backend2

Production-oriented Express 5 + TypeScript + Zod 4 API with PostgreSQL/MySQL persistence, JWT authentication, immediate session revocation, venue ownership, RBAC, and audit logging.

```text
HTTP -> security -> request ID -> logging -> routes -> Zod -> controller -> service -> repository -> storage
                                                                                 |-> Memory
                                                                                 |-> PostgreSQL
                                                                                 |-> MySQL
```

## Version 2.0

`v2.0.0` is a security-focused breaking release: venue reads remain public, but create/update/delete operations now require authentication. A normal user may mutate only venues they own; an `ADMIN` may mutate any venue. Legacy venues without an owner are admin-managed until ownership is migrated deliberately.

## Run

```bash
npm install
npm run dev
```

Local verification:

```bash
npm run verify
```

## Authentication, sessions and RBAC

```text
POST  /v1/auth/register
POST  /v1/auth/login
POST  /v1/auth/refresh
POST  /v1/auth/logout
POST  /v1/auth/logout-all       authenticated
GET   /v1/auth/me               authenticated
GET   /v1/auth/admin/users      ADMIN
PATCH /v1/auth/admin/users/:id/role    ADMIN
PATCH /v1/auth/admin/users/:id/status  ADMIN
GET   /v1/admin/audit-logs      ADMIN
```

Passwords are hashed with Node.js `scrypt`. Refresh tokens are opaque random values and only SHA-256 hashes are stored. Refresh tokens rotate on refresh. `logout-all`, account status changes, and role changes increment a per-user token version, immediately invalidating previously issued access tokens as well as revoking refresh tokens.

Production requires a secret of at least 32 characters:

```text
JWT_SECRET=<strong-random-secret>
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
```

An optional `BOOTSTRAP_ADMIN_EMAIL` promotes only the matching registration to `ADMIN`. Use access tokens as:

```text
Authorization: Bearer <access-token>
```

## Venue ownership

```text
POST   /v1/venues                  authenticated; caller becomes owner
GET    /v1/venues                  public
GET    /v1/venues/:id              public
PATCH  /v1/venues/:id              owner or ADMIN
DELETE /v1/venues/:id              owner or ADMIN
```

Venue responses include `ownerUserId`. Successful create/update/delete operations are written to the audit log. Administrative role/status changes and important authentication events are audited without passwords or token material.

## Storage adapters

The same application contract supports:

```text
STORAGE=memory
STORAGE=postgres
STORAGE=mysql
```

### PostgreSQL

PostgreSQL is the canonical production/schema target for Prisma, Drizzle and TypeORM compatibility tooling.

```bash
STORAGE=postgres \
DATABASE_URL=postgresql://backend2:backend2@localhost:5432/backend2 \
npm run db:migrate
npm run db:contract
```

Canonical migrations live in `migrations/` and are tracked in `schema_migrations`.

### MySQL

MySQL 8.4 is a first-class runtime adapter with independent migrations:

```bash
STORAGE=mysql \
MYSQL_URL=mysql://backend2:backend2@localhost:3307/backend2 \
npm run db:migrate
npm run db:contract:mysql
```

MySQL migrations live in `schema/mysql/`.

Both SQL backends now contain `venues`, `users`, `refresh_tokens`, and `audit_logs`, plus ownership, account-state, token-version and supporting indexes/constraints.

## Docker

Docker Compose runs both complete stacks from the same application image:

```text
http://localhost:3000 -> API -> PostgreSQL 17
http://localhost:3001 -> API -> MySQL 8.4
```

Start everything:

```bash
docker compose up --build
```

The production image runs the selected dialect's migrations before starting the server. Production-mode containers require `JWT_SECRET`.

## Database and schema tooling

- SQL migrations: canonical schema ownership.
- Zod: HTTP boundary validation.
- Prisma: PostgreSQL schema/client compatibility tooling.
- Drizzle: PostgreSQL schema/Drizzle Kit compatibility tooling.
- TypeORM: PostgreSQL metadata compatibility with `synchronize: false`.

Prisma/Drizzle/TypeORM do not independently mutate production schema. Their venue mappings include the nullable ownership column and are validated against the canonical PostgreSQL model.

## Querying venues

Example:

```text
GET /v1/venues?page=1&limit=20&search=hall&minCapacity=100&maxCapacity=5000&sortBy=capacity&order=desc
```

- `page`: 1..10000
- `limit`: 1..100
- `search`: up to 100 characters across name/address
- `minCapacity` / `maxCapacity`: inclusive non-negative integer bounds
- `sortBy`: `createdAt`, `name`, `address`, `capacity`
- `order`: `asc` or `desc`

Unknown sort fields, invalid ranges, negative/fractional capacity bounds, malformed UUIDs and invalid payloads are rejected before business logic executes.

## Documentation and production

Local docs:

```text
http://localhost:3000/docs
http://localhost:3001/docs
```

Machine-readable OpenAPI is at `/openapi.json`. The public deployment is available at `https://backend2-api.onrender.com` with docs at `/docs`.

## Operations and security

- `/health` liveness
- `/ready` selected-storage readiness
- request IDs and structured request logs
- Helmet, CORS, rate limiting and 1 MB JSON limit
- centralized error contract
- graceful PostgreSQL/MySQL pool shutdown
- JWT issuer/audience/algorithm verification
- `USER` / `ADMIN` RBAC
- ownership authorization
- immediate access-token invalidation through token versions
- refresh-token rotation/revocation and expired-token cleanup
- admin account enable/disable and role management
- audit logs with pagination/filtering
- migrations before runtime startup
- PostgreSQL/MySQL backup and restore scripts
- Dependabot and dependency audit
- Docker production-image smoke tests
- GitHub Actions quality gates

### Backup / restore

```bash
npm run db:backup
CONFIRM_RESTORE=yes npm run db:restore -- backups/backend2-<timestamp>.dump

npm run db:backup:mysql
CONFIRM_RESTORE=yes npm run db:restore:mysql -- backups/backend2-mysql-<timestamp>.sql
```

See `docs/BACKUP-RESTORE.md`, `docs/DATABASE-ARCHITECTURE.md`, `docs/PRODUCTION-CHECKLIST.md`, and `SECURITY.md`.

## CI

GitHub Actions validates:

```text
PostgreSQL 17 + MySQL 8.4
  -> migrations
  -> database contracts (venues + auth + ownership + audit)
  -> Prisma validation/generation
  -> Drizzle schema check
  -> TypeORM metadata validation
  -> cross-ORM PostgreSQL smoke test
  -> typecheck
  -> production build
  -> Vitest
  -> PostgreSQL compiled API E2E (auth + ownership + venues)
  -> MySQL compiled API E2E (auth + ownership + venues)
  -> dependency audit
  -> Docker build
  -> PostgreSQL production-image readiness
  -> MySQL production-image readiness
```
