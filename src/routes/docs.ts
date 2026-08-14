import { Router } from "express";

const router = Router();

router.get("/docs", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Backend2 API Docs</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;line-height:1.5;color:#172033}
    code,pre{background:#f4f6f8;border-radius:6px;padding:2px 5px} pre{padding:16px;overflow:auto}
    .card{border:1px solid #dfe3e8;border-radius:12px;padding:20px;margin:16px 0}
    .method{font-weight:700;margin-right:8px}.get{color:#0969da}.post{color:#1a7f37}.patch{color:#9a6700}.delete{color:#cf222e}
    a{color:#0969da}
  </style>
</head>
<body>
  <h1>Backend2 API</h1>
  <p>Express 5 + TypeScript + Zod 4 + PostgreSQL backend.</p>
  <p><a href="/openapi.json">OpenAPI JSON</a></p>
  <div class="card"><b>GET /health</b><p>Liveness check.</p></div>
  <div class="card"><b>GET /ready</b><p>Readiness check including storage health.</p></div>
  <div class="card"><b>POST /v1/venues</b><p>Create a venue. Name is unique; capacity is a positive PostgreSQL INTEGER.</p></div>
  <div class="card"><b>GET /v1/venues</b><p>List with <code>page</code>, <code>limit</code>, <code>search</code>, <code>minCapacity</code>, <code>maxCapacity</code>, <code>sortBy</code>, and <code>order</code>.</p><pre>?minCapacity=500&maxCapacity=2000&sortBy=capacity&order=asc&page=1&limit=20</pre></div>
  <div class="card"><b>GET /v1/venues/:id</b><p>Fetch a venue by UUID.</p></div>
  <div class="card"><b>PATCH /v1/venues/:id</b><p>Partially update a venue.</p></div>
  <div class="card"><b>DELETE /v1/venues/:id</b><p>Delete a venue.</p></div>
  <div class="card"><h2>Capacity ranges</h2><p>Filtering is inclusive: <code>minCapacity &lt;= capacity &lt;= maxCapacity</code>. Setting both values equal performs an exact-capacity search.</p></div>
</body>
</html>`);
});

export default router;
