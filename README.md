# Eventify — Session 4

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Run the ownership proof after seeding:

```bash
npm test
```

Policy decision for `GET /v1/bookings/:id`: it requires authentication and allows only the booking owner or an ADMIN, because exposing another attendee's booking would be an object-level authorization failure.

`GET /v1/events` and `GET /v1/events/:id` remain public because event discovery is public catalog data; all mutations are authenticated and authorization is enforced separately.
