# Session 3 plan

- [x] Replace all in-memory Event storage with Prisma repositories.
- [x] Replace all in-memory Booking storage with Prisma repositories.
- [x] Make booking creation Serializable and transactional.
- [x] Support cancel-then-rebook by flipping the existing row back to CONFIRMED.
- [x] Map Prisma P2002 duplicate failures to HTTP 409.
- [x] Add an idempotent seed with 20 parallel-booking users and a capacity-5 event.
- [x] Add the bookings-by-user index migration and EXPLAIN command notes.
