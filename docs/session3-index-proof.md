# Session 3 — booking-user index proof

Eventify's Prisma schema declares `@@index([userId])`, and migration `202608200002_booking_user_index` creates the physical index used by the booking-history lookup.

To reproduce the course's before/after proof safely, use a disposable local database populated with the Session 3 sandbox data. Run `EXPLAIN (ANALYZE, BUFFERS)` for the generated `Booking.userId` query before adding the index, create the index, then run the identical plan again. The expected engineering conclusion is not a memorized cost number: the indexed plan should avoid scanning the entire booking table to find one user's rows.

Never drop a production index merely to manufacture a "before" screenshot.
