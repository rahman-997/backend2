# backend2

Express 5 + TypeScript + Zod 4 backend with a layered `/v1/venues` CRUD resource.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Type check

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

## API

- `POST /v1/venues`
- `GET /v1/venues?limit=20`
- `GET /v1/venues/:id`
- `PATCH /v1/venues/:id`
- `DELETE /v1/venues/:id`

## Venue

```json
{
  "id": "server-generated",
  "name": "Unique venue name",
  "address": "Venue address",
  "capacity": 100,
  "contactEmail": "contact@example.com",
  "createdAt": "server-generated"
}
```

Business logic is kept in the service layer, request validation is middleware-based, and errors are handled centrally. Venue data is stored in an in-memory `Map`, so it is reset when the process restarts.
