import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("dist");
const required = ["index.html", "manifest.webmanifest", "service-worker.js", "offline.html", "icon.svg", "pwa-install.js", "pwa-install.css"];

await Promise.all(required.map((file) => access(resolve(dist, file))));

const [html, manifestRaw, worker] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "manifest.webmanifest"), "utf8"),
  readFile(resolve(dist, "service-worker.js"), "utf8"),
]);

const manifest = JSON.parse(manifestRaw);
const failures = [];

if (!html.includes('rel="manifest"') || !html.includes("/manifest.webmanifest")) failures.push("index.html must link the web app manifest");
if (manifest.name !== "Eventify — Discover & Book Events") failures.push("manifest must expose the Eventify product name");
if (manifest.display !== "standalone") failures.push("manifest display must be standalone");
if (manifest.start_url !== "/" || manifest.scope !== "/") failures.push("manifest start_url and scope must remain root-scoped");
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) failures.push("manifest must include an install icon");
if (!worker.includes('url.pathname.startsWith("/api/")')) failures.push("service worker must never cache API traffic");
if (!worker.includes("networkFirstNavigation")) failures.push("service worker must use network-first navigation");

if (failures.length > 0) {
  console.error(`PWA verification failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`PWA verification passed (${required.length} production artifacts).`);
