# Eventify Sessions 0–5 implementation plan

- [x] Session 0: JavaScript katas are immutable where required, plus typed TypeScript equivalents with no `any`.
- [x] Session 1: strict domain types, historical raw `node:http` lab, health/events/404 behavior, async JSON loading lab.
- [x] Session 2: Express 5 layers, Zod 4 body/query validation, centralized errors, pagination and filtering.
- [x] Session 2 stretch: waitlist semantics are implemented instead of overselling/rejecting at capacity.
- [x] Session 3: PostgreSQL + Prisma migrations/repositories, unique constraints, booking-user index, idempotent seed.
- [x] Session 3: Serializable booking transaction with bounded P2034 retry; cancelled rows can rebook.
- [x] Session 3: architecture guard and canonical `AGENTS.md` rules.
- [x] Session 4: Argon2id, strict public signup, short JWT access tokens, opaque rotating refresh tokens, ownership guards.
- [x] Session 4 stretch: refresh replay revokes descendants; per-account login throttling avoids account enumeration.
- [x] Session 4: Helmet, explicit credentialed CORS, Redis-backed auth rate limiting.
- [x] Session 5: Redis cache-aside for event lists/details with TTL, stampede lock, fail-open reads, invalidation on writes.
- [x] Session 5: Redis shared readiness and production Key Value infrastructure.
- [x] Session 5: BullMQ queue + worker, retries/exponential backoff/failure handling.
- [x] Session 5: PostgreSQL outbox makes booking-confirmation jobs recoverable even if ephemeral Redis restarts.
- [x] Session 5: confirmed booking creates confirmation job; cancellation triggers waitlist promotion.
- [x] Session 5: CI runs PostgreSQL + Redis, API tests, frontend build, architecture check, audits.
- [ ] SMTP delivery credentials are intentionally not committed; production defaults to safe `EMAIL_MODE=log` until an SMTP secret is supplied.
