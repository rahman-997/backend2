# Session 3 Homework — Bookings That Survive a Restart

One PR to your `eventify` repo, starting from the **session-3 starter branch**. Estimated effort: **4–6 hours**. Everything below builds exactly what Session 4 protects with auth — the chain continues.

## Before any code: plan first

The Superpowers loop, same as every week:

1. **Brainstorm** the tasks with your agent.
2. Commit a short **`tasks/todo.md`** plan with checkable items — as the PR's **first commit**.
3. **Implement against it**, checking items off as you go.

The plan is part of the deliverable.

## What the starter branch ships

| File | What it is |
|---|---|
| `src/bookings/create-booking.skeleton.ts` | The transaction wrapper — `prisma.$transaction` with `Serializable` isolation **already set**, the retry loop stubbed as a stretch, and `TODO(student)` markers for the three things you write: the capacity check, the CANCELLED-row flip, and the `P2002` → 409 mapping. |
| `scripts/parallel-bookings.ts` | The concurrency proof from the drill: fires 20 simultaneous `POST /v1/bookings` for one event as 20 distinct users, prints a status-code tally, and exits non-zero on oversell. Ships ready — you don't edit it. |
| `scripts/fixtures/parallel-users.json` | What the script reads: `baseUrl`, the target `eventId` + `capacity`, and 20 `{ userId, token }` entries. Replace the `REPLACE_*` placeholders with ids from your seed. Tokens stay `""` until Session 4 adds auth. |

Everything else — your Sessions 1–2 Eventify code, the instructor's `docker-compose.yml`, and the Prisma schema you built in class — carries over. `session-3-starter/README.md` restates given vs yours-to-build.

## The contract

### The schema — what you built in class

The homework runs on the class schema. The heart of it:

```prisma
enum BookingStatus {
  CONFIRMED
  CANCELLED
  WAITLISTED
}

model Booking {
  id        String        @id @default(uuid(7)) @db.Uuid
  userId    String        @db.Uuid
  eventId   String        @db.Uuid
  status    BookingStatus @default(CONFIRMED)
  createdAt DateTime      @default(now())
  user      User          @relation(fields: [userId], references: [id])
  event     Event         @relation(fields: [eventId], references: [id])
  @@unique([userId, eventId])   // one booking per user per event
}
```

`User` (with `role: ATTENDEE | ORGANIZER | ADMIN`, unique `email`) and `Event` (title, description, venue, startsAt, capacity, priceCents, organizerId, createdAt) mirror the Session 1 domain model exactly.

### The API — same endpoints, now on Postgres

Nothing new is added tonight; the Session 2 surface moves onto the database:

- **`/v1/events`** — POST, GET (list + by id), PATCH, DELETE, including S2's pagination (`?page`, `?limit`, envelope `{ data, page, limit, total }`) and filtering (`?venue`, `?from`, `?to`) → task 1
- **`/v1/bookings`** — POST (create), GET by id, DELETE (soft cancel: the row stays, status `CANCELLED`) → task 2

Controllers must not change. If they do, logic is in the wrong layer.

### Rebooking semantics — the part everyone botches

Cancellation is soft, and `@@unique([userId, eventId])` means a returning user can never get a second row. So inside the transaction, after the capacity check, look up the existing row (`tx.booking.findUnique({ where: { userId_eventId: { userId, eventId } } })`) and act on what you find:

| Existing row | Your code does |
|---|---|
| none | `create` with status `CONFIRMED` |
| `CANCELLED` | **flip it back to `CONFIRMED`** — same transaction, same capacity check |
| `CONFIRMED` | it's a duplicate — let the unique constraint fire and map `P2002` → **409** |
| `WAITLISTED` | leave it alone — promotion is Session 5's job |

### Prisma 7 reminders from class

- Generator is `prisma-client` with `output` in your source tree; the `@prisma/adapter-pg` driver adapter is **required**; config lives in `prisma.config.ts`; Prisma does **not** auto-load `.env`.
- `DATABASE_URL` is read through `src/config.ts` (extend the envSchema and `.env.example`) — never `process.env` directly.
- Inside the transaction everything reads and writes through `tx`, never `prisma` — touching `prisma` there silently escapes the transaction and reopens the oversell race.

## The tasks

1. **Finish the repository swap.** All `/events` endpoints — including S2's pagination and filtering — run against Postgres via Prisma repositories.
   *Acceptance:* fresh clone + `docker compose up -d` + `npx prisma migrate dev` + `npm run dev` works; no in-memory stores remain; controllers unchanged. Test in a literal fresh clone — your own working tree hides missing `.env` and generated files, and the fresh clone is how the PR gets reviewed.

2. **Transactional bookings.** Fill in the three `TODO(student)` sections of `create-booking.skeleton.ts` — capacity check (count `CONFIRMED` only), the rebooking flip, the create — plus the `P2002` → 409 mapping, then fold the finished function into `src/bookings/bookings.service.ts` and call it from the controller. Prove it:

   ```bash
   docker compose up -d
   npx prisma migrate dev
   npx prisma db seed          # copy 20 user ids + the capacity-5 event id
                               # into scripts/fixtures/parallel-users.json
   npm run dev                 # terminal 1
   node scripts/parallel-bookings.ts   # terminal 2
   ```

   Then confirm against the source of truth in psql:

   ```sql
   SELECT status, COUNT(*) FROM "Booking"
   WHERE "eventId" = '<your-event-id>' GROUP BY status;
   ```

   *Acceptance:* only `CONFIRMED` bookings count toward capacity; the script never oversells — expected tally **exactly 5× `201`, 15× `409`** (a few `500`s from `P2034` are acceptable until the retry stretch, but never more than 5 `201`s); duplicate `CONFIRMED` booking → 409 via the `P2002` mapping; full event → 409; cancel-then-rebook → **201** with status `CONFIRMED`.

3. **Seed script.** `prisma/seed.ts`, registered in `prisma.config.ts`: 3+ users (one `ORGANIZER`, one `ADMIN`), 5 events, some bookings — **plus** what the task-2 script needs: 20 distinct users and one capacity-5 event.
   *Acceptance:* idempotent — runs twice without errors or duplicates (`upsert`).

4. **Prove an index.** Enable Prisma query logging (`log: ['query']`), take your "bookings by user" query, and run `EXPLAIN ANALYZE` on it in psql before and after adding an index.
   *Acceptance:* the PR description shows both plans and **two sentences of your own interpretation** — your words, not your assistant's.

## Your PR description

One PR; it must contain: how to run it (a classmate follows your README from a fresh clone), the task-4 before/after plans with your two sentences, and the exit-ticket answer in one sentence — *your booking service checked capacity before every insert and the event still oversold: why did the check fail, and what property of the fix makes overselling impossible?*

## Stretch (optional)

- **Implement the stubbed retry loop.** Catch serialization failures (Prisma `P2034`) and re-run the whole transaction a bounded number of times — the skeleton comment sketches the shape.
- **Waitlist instead of reject.** When an event is full, create the booking as `WAITLISTED` inside the same transaction instead of returning 409 — this sets up Session 5's waitlist-promotion job.

---

**Remember:** any function in this PR may be your random walkthrough pick at the start of Session 4. AI writes with you — you own and can explain every line you ship.
