import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) throw new Error("API_BASE_URL is required");

const app = express();
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "content-security-policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
  );
  next();
});

app.use(
  "/api",
  createProxyMiddleware({
    target: apiBaseUrl,
    changeOrigin: true,
    secure: true,
    pathRewrite: { "^/api": "" },
    cookiePathRewrite: { "/v1/auth": "/api/v1/auth" },
  }),
);

const dist = join(__dirname, "dist");

app.get("/service-worker.js", (_req, res) => {
  res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
  res.setHeader("service-worker-allowed", "/");
  res.sendFile(join(dist, "service-worker.js"));
});

app.use(
  express.static(dist, {
    etag: true,
    setHeaders(res, filePath) {
      const isHashedAsset = filePath.includes(`${sep}assets${sep}`);
      if (isHashedAsset) {
        res.setHeader("cache-control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html") || filePath.endsWith(".webmanifest") || filePath.endsWith("pwa-install.js")) {
        res.setHeader("cache-control", "no-cache");
      } else {
        res.setHeader("cache-control", "public, max-age=3600");
      }
    },
  }),
);

app.get("/{*splat}", (_req, res) => {
  res.setHeader("cache-control", "no-cache");
  res.sendFile(join(dist, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Eventify web listening on 0.0.0.0:${port}`);
});
