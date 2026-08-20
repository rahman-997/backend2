import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) throw new Error("API_BASE_URL is required");

const app = express();

app.use(
  "/api",
  createProxyMiddleware({
    target: apiBaseUrl,
    changeOrigin: true,
    secure: true,
    pathRewrite: { "^/api": "" },
    cookiePathRewrite: { "/v1/auth/refresh": "/api/v1/auth/refresh" },
  }),
);

const dist = join(__dirname, "dist");
app.use(express.static(dist, { maxAge: "1h", etag: true }));
app.get("/{*splat}", (_req, res) => res.sendFile(join(dist, "index.html")));

app.listen(port, "0.0.0.0", () => {
  console.log(`Eventify web listening on 0.0.0.0:${port}`);
});
