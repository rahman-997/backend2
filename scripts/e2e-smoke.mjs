import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["dist/server.js"], {
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[api] ${chunk}`));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  let body = null;
  if (response.status !== 204) {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  }
  return { response, body };
}

async function waitForReadiness() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`API exited before readiness with code ${server.exitCode}`);
    try {
      const { response } = await request("/ready");
      if (response.status === 200) return;
    } catch {
      // Server may still be starting.
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for /ready");
}

const expectStatus = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
};

try {
  await waitForReadiness();

  const health = await request("/health");
  expectStatus(health.response.status, 200, "health");
  if (!health.response.headers.get("x-request-id")) throw new Error("health response is missing x-request-id");

  const token = randomUUID();
  const name = `E2E Venue ${token}`;
  const createPayload = {
    name,
    address: "E2E Address",
    capacity: 750,
    contactEmail: `e2e-${token}@example.com`,
  };

  const created = await request("/v1/venues", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  expectStatus(created.response.status, 201, "create venue");
  const id = created.body?.data?.id;
  if (!id) throw new Error("create venue did not return an id");

  const duplicate = await request("/v1/venues", {
    method: "POST",
    body: JSON.stringify({ ...createPayload, name: name.toLowerCase(), contactEmail: `dup-${token}@example.com` }),
  });
  expectStatus(duplicate.response.status, 409, "case-insensitive duplicate name");

  const list = await request(`/v1/venues?search=${encodeURIComponent(token)}&minCapacity=750&maxCapacity=750&sortBy=capacity&order=asc&limit=20`);
  expectStatus(list.response.status, 200, "filtered venue list");
  if (!Array.isArray(list.body?.data) || list.body.data.length !== 1 || list.body.data[0]?.id !== id) {
    throw new Error("filtered list did not return the expected venue");
  }

  const fetched = await request(`/v1/venues/${id}`);
  expectStatus(fetched.response.status, 200, "get venue");

  const updated = await request(`/v1/venues/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ capacity: 900 }),
  });
  expectStatus(updated.response.status, 200, "update venue");
  if (updated.body?.data?.capacity !== 900) throw new Error("updated capacity was not persisted");

  const removed = await request(`/v1/venues/${id}`, { method: "DELETE" });
  expectStatus(removed.response.status, 204, "delete venue");

  const missing = await request(`/v1/venues/${id}`);
  expectStatus(missing.response.status, 404, "get deleted venue");

  console.log("Compiled API end-to-end smoke test passed");
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      sleep(5_000).then(() => server.kill("SIGKILL")),
    ]);
  }
}
