# Eventify

Eventify is the cumulative Backend Track project through Session 5: strict TypeScript, Express 5 + Zod 4, PostgreSQL/Prisma, secure authentication, Redis cache/rate limits, and BullMQ background jobs.

## Architecture

`route → controller → service → repository/data source`

PostgreSQL is authoritative. Redis is shared ephemeral infrastructure for cache-aside reads, distributed throttling and BullMQ. Booking side effects use a PostgreSQL outbox so a Redis restart cannot silently lose the intent to send a confirmation or promote a waitlisted attendee.

## Fresh clone

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

In another terminal, build and run the background worker:

```bash
npm run build
npm run worker
```

Frontend:

```bash
cd web
npm install
npm run dev
```

## Important endpoints

- `GET /health` — liveness only
- `GET /ready` — PostgreSQL + Redis readiness
- `POST /v1/auth/signup`, `/login`, `/refresh`, `/logout`; `GET /v1/auth/me`
- `GET /v1/events` — public search/filter/pagination, cache-aside
- `GET /v1/events/:id` — cached public detail
- protected organizer create/update/delete, `/v1/events/mine`, and `/:id/stats`
- `POST /v1/bookings`, `GET /v1/bookings/mine`, item read/cancel

At capacity a new booking becomes `WAITLISTED`. Cancelling a confirmed booking creates a durable promotion job; the worker promotes the oldest waitlisted rows when seats are available.

## Security

- Argon2id password hashing; legacy scrypt hashes are migrated on successful login.
- Public signup is an explicit allowlist and always creates `ATTENDEE`.
- 15-minute HS256 access JWTs; opaque hashed refresh tokens rotate on every refresh.
- Refresh replay revokes the replacement chain.
- Access token belongs in memory; refresh token is an HttpOnly + Secure + SameSite cookie.
- Helmet, explicit credentialed CORS, Redis-backed auth rate limits and per-account lockout.
- Event ownership and booking ownership are enforced server-side.

## Cache + async jobs

Event lists and details use cache-aside with mandatory TTLs, short distributed miss locks, and write invalidation. Cache failures fall back to PostgreSQL.

BullMQ jobs use retries with exponential backoff. `EMAIL_MODE=log` is the safe default; set `EMAIL_MODE=smtp` and inject `SMTP_URL` as a secret to deliver real email.

## Verification

```bash
npm run verify
npm audit --audit-level=high
cd web && npm run build && npm audit --audit-level=high
```

`npm run verify` includes Prisma generation, strict type checking, Vitest integration tests, the production build, and dependency-cruiser architecture rules. GitHub Actions also runs Semgrep CE and CodeQL.

See `AGENTS.md`, `tasks/todo.md`, `docs/security-triage.md`, and the `labs/` directory for the course-specific implementation artifacts.
