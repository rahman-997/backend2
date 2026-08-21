# Changelog

All notable Eventify changes are documented here.

## 1.0.0 — 2026-08-21

### Product
- Event discovery, search, pagination, live availability and organizer analytics.
- Secure attendee booking with waitlists, cancellation and automatic promotion.
- React/Vite web experience with authenticated attendee and organizer workspaces.
- Installable PWA with manifest, standalone launch, native install prompt and offline shell fallback.

### Platform
- Express 5 + strict TypeScript + Zod 4 layered API.
- PostgreSQL/Prisma as the authoritative store with Serializable booking transactions.
- Redis cache-aside, distributed throttling, worker heartbeat and BullMQ queues.
- Durable PostgreSQL outbox for recoverable booking notifications and waitlist jobs.
- Adaptive worker polling, Redis runtime isolation and production query indexes.

### Security
- Argon2id password hashing and secure legacy-hash migration.
- Short-lived access JWTs and opaque rotating refresh tokens with replay-chain revocation.
- HttpOnly/Secure refresh cookies, event/booking ownership, credentialed CORS and Redis-backed auth throttling.
- Helmet/CSP on the API, hardened browser headers on the web runtime, structured-log redaction, Semgrep and CodeQL gates.

### Reliability and operations
- `/health`, `/ready` and Prometheus `/metrics` for API and worker.
- Request correlation, structured JSON logs, graceful shutdown and bounded dependency checks.
- Prisma migration retry backoff with jitter for overlapping deploys.
- Production PWA verification and bundle budgets in CI.
- Immutable caching for hashed frontend assets while HTML, manifests and service-worker bootstrap remain revalidatable.

### Deployment
- Render web, API, worker and Redis services.
- Neon PostgreSQL production database.
- Automated GitHub Actions CI/security gates and Render auto-deploy from `main`.
