# Database Architecture

## Canonical database

PostgreSQL is the production database and SQL migrations are the canonical schema source.

## Dockerized databases

Docker Compose runs both PostgreSQL and MySQL 8.4.

- PostgreSQL is the active API persistence database.
- MySQL is a real compatibility database, initialized from `schema/mysql/001_create_venues.sql` and persisted in its own Docker volume.
- MySQL is currently not selected by the API runtime because there is no MySQL `VenueRepository` adapter yet.

This distinction matters: Dockerizing MySQL proves the schema can be created and used as a real database service, but it does not automatically make the Express application query MySQL.

## Schema representations

- `migrations/` — canonical PostgreSQL SQL schema and constraints.
- `schema/mysql/` — MySQL-compatible SQL schema used by the Dockerized MySQL service.
- `prisma/schema.prisma` — Prisma representation used for validation/generation.
- `drizzle/schema.ts` — Drizzle representation used for schema checks.
- `src/db/typeorm/Venue.entity.ts` — TypeORM representation used for metadata validation.
- Zod schemas — API boundary validation; they are not database migrations.

## Rule

Only one persistence adapter is selected for application runtime. ORM schemas must not independently mutate production schema. `synchronize` is disabled for TypeORM and Prisma/Drizzle are validation/adapter layers unless explicitly selected.

## Consistency requirements

Every representation must preserve the domain contract as closely as the target database allows:

- UUID-compatible primary key
- unique venue name
- positive integer capacity
- contact email length <= 320
- timestamps
- appropriate indexes and constraints

CI validates the PostgreSQL ORM representations after applying canonical SQL migrations. MySQL is initialized independently in Docker from its MySQL-specific schema.
