# Session 3 Starter — Given vs Yours to Build

## Given by the starter

- `src/bookings/create-booking.skeleton.ts`: Serializable transaction wrapper with `TODO(student)` sections.
- `scripts/parallel-bookings.ts`: concurrency proof that fires 20 simultaneous booking requests.
- `scripts/fixtures/parallel-users.json`: fixture containing `baseUrl`, target event/capacity, and 20 users.
- `docker-compose.yml`: PostgreSQL development service from class.
- The Sessions 1–2 Eventify code and the Prisma schema built in class.

## Yours to build

- Replace in-memory Event and Booking persistence with Prisma/PostgreSQL repositories while leaving controllers unchanged.
- Complete transactional booking creation: capacity check, cancel-then-rebook, create, and `P2002` → 409 mapping.
- Add an idempotent Prisma seed with 20 distinct users and one capacity-5 event.
- Prove the bookings-by-user index with `EXPLAIN ANALYZE` before and after the index.

The completed implementation is in the normal `src/` files on this branch; the skeleton is kept as the starter reference.
