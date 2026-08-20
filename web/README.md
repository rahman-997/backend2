# Eventify Web

React + Vite frontend for the Eventify API.

The browser calls `/api/*` on the same origin. The production Node server proxies those requests to `API_BASE_URL`, preserving the HttpOnly refresh-token flow without exposing backend credentials or refresh tokens to JavaScript.

```bash
npm install
API_BASE_URL=http://localhost:3000 npm run dev
```

Production:

```bash
npm run build
API_BASE_URL=https://your-api.example.com npm start
```
