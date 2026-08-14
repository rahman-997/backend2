# Database Architecture

## Canonical database

PostgreSQL is the production database and SQL migrations are the canonical schema source.

## Schema representations

- `migrations/` — canonical SQL schema and constraints.
- `prisma/schema.prisma` — Prisma representation used for validation/generation.
- `drizzle/schema.ts` — Drizzle representation used for schema checks.
- `src/db/typeorm/Venue.entity.ts` — TypeORM representation used for metadata validation.
- Zod schemas — API boundary validation; they are not database migrations.

## Rule

Only one persistence adapter is selected for application runtime. ORM schemas must not independently mutate production schema. `synchronize` is disabled for TypeORM and Prisma/Drizzle are validation/adapter layers unless explicitly selected.

## Consistency requirements

Every representation must preserve:

- UUID primary key
- unique venue name
- positive integer capacity
- contact email length <= 320
- timestamps
- PostgreSQL indexes and constraints

CI validates the ORM representations after applying SQL migrations.
