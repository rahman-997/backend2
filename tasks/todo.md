# Session 3 plan

- [ ] Replace all in-memory Event storage with Prisma repositories.
- [ ] Replace all in-memory Booking storage with Prisma repositories.
- [ ] Make booking creation Serializable and transactional.
- [ ] Support cancel-then-rebook by flipping the existing row back to CONFIRMED.
- [ ] Map Prisma P2002 duplicate failures to HTTP 409.
- [ ] Add an idempotent seed with 20 parallel-booking users and a capacity-5 event.
- [ ] Add the bookings-by-user index migration and EXPLAIN command notes.
