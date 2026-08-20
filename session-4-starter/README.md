# Session 4 Starter — Given vs Yours to Build

## Given by the starter

- `prisma/refresh-token.model.prisma`: the `RefreshToken` model block to copy into `prisma/schema.prisma`.
- `prisma/migration.sql`: SQL expected from the refresh-token migration.
- `rotation-flow.md`: the refresh-token rotation flow and sequence diagram.
- This README, restating the starter boundary.

## Yours to build

- Apply `requireAuth` / role policy to all Eventify routes according to the Session 4 route-policy matrix.
- Add ownership checks so organizers can mutate only their own events, admins can bypass event ownership, and users can cancel only their own bookings.
- Implement signup, login, access JWTs, opaque refresh tokens, SHA-256-at-rest storage, and atomic refresh-token rotation.
- Add a second seeded organizer and prove the forbidden cross-owner path.
- Keep secrets in the validated config schema and keep response DTOs allowlisted.
