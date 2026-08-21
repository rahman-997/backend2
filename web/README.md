# Eventify Web

React + Vite frontend for the Eventify API, shipped as an installable Progressive Web App.

The browser calls `/api/*` on the same origin. The production Node server proxies those requests to `API_BASE_URL`, preserving the HttpOnly refresh-token flow without exposing backend credentials or refresh tokens to JavaScript.

## PWA behavior

- `manifest.webmanifest` enables standalone installation.
- `service-worker.js` caches only the public app shell and hashed static assets.
- `/api/*` is explicitly excluded from service-worker caching so authenticated responses, live seat counts and bookings never become stale/offline data.
- Navigations are network-first with a saved shell/offline fallback.
- The install prompt is progressive enhancement and can be dismissed for seven days.
- Hashed Vite assets are immutable for one year; HTML, the manifest and install bootstrap remain revalidatable.

```bash
npm install
API_BASE_URL=http://localhost:3000 npm run dev
```

Production verification:

```bash
npm run verify
API_BASE_URL=https://your-api.example.com npm start
```

`npm run verify` builds the application, enforces bundle budgets and validates the production PWA artifact contract.
