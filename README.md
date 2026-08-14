# backend2

Express 5 + TypeScript + Zod 4 backend with a layered `/v1/venues` CRUD resource.

## Architecture

```text
routes -> validation middleware -> controller -> service -> in-memory Map
                                      |
                                      +-> centralized error middleware
```

Business logic belongs in the service layer. Routes wire middleware and controllers, controllers handle HTTP concerns, and validation is performed before controller execution.

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

## Tests

```bash
npm test
```

The test suite covers create, list limits, get, update, delete, duplicate names (`409`), missing IDs (`404`), validation failures (`400`), empty patches, and invalid limits.

## API

- `POST /v1/venues`
- `GET /v1/venues?limit=20`
- `GET /v1/venues/:id`
- `PATCH /v1/venues/:id`
- `DELETE /v1/venues/:id`

## Create example

```json
{
  "name": "Main Hall",
  "address": "1 Example Street",
  "capacity": 500,
  "contactEmail": "contact@example.com"
}
```

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

## CI

GitHub Actions runs dependency installation, TypeScript type checking, production build, and the test suite on pushes and pull requests targeting `main`.

## Data storage

Venue data is stored in an in-memory `Map`, so it is reset when the process restarts.
