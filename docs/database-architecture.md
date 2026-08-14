# Database architecture

## Supported representations

The canonical production database is PostgreSQL and its SQL migrations are the source of truth for the running application.

Equivalent schema representations are maintained for compatibility and tooling:

- PostgreSQL SQL migrations: `src/db/migrations/`
- Prisma: `prisma/schema.prisma`
- Drizzle: `drizzle/schema.ts`
- TypeORM: `src/db/typeorm/Venue.entity.ts`
- MySQL reference schema: `schema/mysql/001_create_venues.sql`
- Zod: request/input validation in `src/validation/`

## Rule

Only one database adapter is active for a given deployment. The application business layer must depend on repository interfaces, never directly on an ORM.

PostgreSQL is the default and production-tested adapter. Prisma, Drizzle, TypeORM, and the MySQL schema are compatibility/tooling layers unless an explicit adapter is enabled and tested in CI.

## Invariants

Every representation must preserve:

- UUID/string identifier semantics
- unique venue name
- positive integer capacity
- contact email
- server-generated timestamps
- compatible nullability and field lengths

Do not use multiple ORMs simultaneously against the same request path.
