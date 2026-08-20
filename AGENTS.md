# Eventify agent guide

## Run

- Node 24+
- `docker compose up -d` starts PostgreSQL and Redis/Valkey-compatible local infrastructure.
- Copy `.env.example` to `.env`, then run `npm install`, `npm run db:deploy`, `npm run db:seed`.
- API: `npm run dev`
- Background worker: build once with `npm run build`, then `npm run worker`.
- Frontend: `cd web && npm install && npm run dev`.
- Full verification: `npm run verify`; frontend: `cd web && npm run build`.

## Conventions

- Express 5 + TypeScript strict mode + Zod 4.
- Routes wire middleware/controllers. Controllers translate HTTP only. Services own business rules and transactions. Repositories own ordinary Prisma CRUD/query calls.
- Never put Prisma calls or repositories in controllers/routes.
- Request schemas use `z.strictObject` for mutation bodies. Server-owned fields are never client-writable.
- Throw `HttpError`; the centralized error middleware owns error responses.
- PostgreSQL is the source of truth. Redis is shared ephemeral infrastructure for cache, rate limits, and BullMQ.
- Cache-aside reads must have TTLs; writes invalidate event detail + collection namespace.
- Booking capacity decisions run at Serializable isolation and retry bounded `P2034` serialization conflicts.
- Background side effects originate from the PostgreSQL outbox. BullMQ delivery is at-least-once; processors must be safe to retry.

## Security rules

- Passwords: Argon2id with the Session 4 baseline. Legacy scrypt hashes may only be verified for migration and are rehashed after a successful login.
- Public signup always creates `ATTENDEE`; `role`, ids, ownership and timestamps are server-controlled.
- JWT access tokens: HS256 pinned during verification, 15-minute TTL, held by clients in memory.
- Refresh tokens: opaque random values, SHA-256 hashed in PostgreSQL, HttpOnly + Secure + SameSite cookie, rotate on every use. Replay of a rotated token revokes its replacement chain.
- Never put tokens or credentials in git, logs, cache values, URLs, or localStorage.
- CORS uses an explicit origin with credentials; Helmet is always enabled.
- Authentication throttling is Redis-backed and account lock responses do not reveal whether an email exists.

## Ownership

AI may draft code, but every shipped line must be explainable and verified against tests, docs, and the real project state.
