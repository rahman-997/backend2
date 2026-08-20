# Eventify — Session 3

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

In another terminal:

```bash
node scripts/parallel-bookings.ts
```

Expected capacity proof: never more than five `201` responses for the capacity-5 event.

Index proof commands:

```sql
EXPLAIN ANALYZE SELECT * FROM "Booking" WHERE "userId" = '<user-id>';
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
EXPLAIN ANALYZE SELECT * FROM "Booking" WHERE "userId" = '<user-id>';
```
