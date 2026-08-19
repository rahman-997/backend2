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
const bearer = (token) => ({ authorization: `Bearer ${token}` });

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
    } catch {}
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

  const authId = randomUUID();
  const authEmail = `e2e-auth-${authId}@example.com`;
  const authPassword = `E2E-strong-password-${authId}`;
  const registered = await request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "E2E Auth User", email: authEmail, password: authPassword }),
  });
  expectStatus(registered.response.status, 201, "register user");
  const userId = registered.body?.data?.user?.id;
  const firstAccessToken = registered.body?.data?.tokens?.accessToken;
  const firstRefreshToken = registered.body?.data?.tokens?.refreshToken;
  if (!userId || !firstAccessToken || !firstRefreshToken) throw new Error("register did not return user and auth tokens");

  expectStatus((await request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Duplicate", email: authEmail.toUpperCase(), password: authPassword }),
  })).response.status, 409, "duplicate auth email");

  const me = await request("/v1/auth/me", { headers: bearer(firstAccessToken) });
  expectStatus(me.response.status, 200, "authenticated profile");
  if (me.body?.data?.email !== authEmail || me.body?.data?.isActive !== true) throw new Error("authenticated profile returned incorrect state");

  const login = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: authEmail, password: authPassword }),
  });
  expectStatus(login.response.status, 200, "login user");

  const refreshed = await request("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: firstRefreshToken }),
  });
  expectStatus(refreshed.response.status, 200, "rotate refresh token");
  const rotatedRefreshToken = refreshed.body?.data?.tokens?.refreshToken;
  if (!rotatedRefreshToken || rotatedRefreshToken === firstRefreshToken) throw new Error("refresh token was not rotated");

  expectStatus((await request("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: firstRefreshToken }),
  })).response.status, 401, "reject reused refresh token");

  expectStatus((await request("/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
  })).response.status, 204, "logout user");
  expectStatus((await request("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
  })).response.status, 401, "reject revoked refresh token");

  const token = randomUUID();
  const name = `E2E Venue ${token}`;
  const createPayload = { name, address: "E2E Address", capacity: 750, contactEmail: `e2e-${token}@example.com` };

  expectStatus((await request("/v1/venues", { method: "POST", body: JSON.stringify(createPayload) })).response.status, 401, "reject unauthenticated venue creation");

  const created = await request("/v1/venues", {
    method: "POST",
    headers: bearer(firstAccessToken),
    body: JSON.stringify(createPayload),
  });
  expectStatus(created.response.status, 201, "create venue");
  const id = created.body?.data?.id;
  if (!id) throw new Error("create venue did not return an id");
  if (created.body?.data?.ownerUserId !== userId) throw new Error("created venue was not assigned to authenticated owner");

  const secondId = randomUUID();
  const second = await request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "E2E Second User", email: `second-${secondId}@example.com`, password: `Second-strong-password-${secondId}` }),
  });
  expectStatus(second.response.status, 201, "register second user");
  const secondAccessToken = second.body?.data?.tokens?.accessToken;
  if (!secondAccessToken) throw new Error("second registration did not return access token");
  expectStatus((await request(`/v1/venues/${id}`, {
    method: "PATCH",
    headers: bearer(secondAccessToken),
    body: JSON.stringify({ capacity: 751 }),
  })).response.status, 403, "reject non-owner venue update");

  const duplicate = await request("/v1/venues", {
    method: "POST",
    headers: bearer(firstAccessToken),
    body: JSON.stringify({ ...createPayload, name: name.toLowerCase(), contactEmail: `dup-${token}@example.com` }),
  });
  expectStatus(duplicate.response.status, 409, "case-insensitive duplicate name");

  const raceToken = randomUUID();
  const raceName = `Concurrent Venue ${raceToken}`;
  const racePayload = { name: raceName, address: "Concurrent E2E Address", capacity: 650, contactEmail: `race-a-${raceToken}@example.com` };
  const raceResponses = await Promise.all([
    request("/v1/venues", { method: "POST", headers: bearer(firstAccessToken), body: JSON.stringify(racePayload) }),
    request("/v1/venues", {
      method: "POST",
      headers: bearer(firstAccessToken),
      body: JSON.stringify({ ...racePayload, name: raceName.toLowerCase(), contactEmail: `race-b-${raceToken}@example.com` }),
    }),
  ]);
  const raceStatuses = raceResponses.map(({ response }) => response.status).sort((a, b) => a - b);
  if (raceStatuses[0] !== 201 || raceStatuses[1] !== 409) throw new Error(`concurrent duplicate race: expected statuses 201,409; got ${raceStatuses.join(",")}`);
  const raceWinner = raceResponses.find(({ response }) => response.status === 201)?.body?.data?.id;
  if (!raceWinner) throw new Error("concurrent duplicate race did not return the winning venue id");
  expectStatus((await request(`/v1/venues/${raceWinner}`, { method: "DELETE", headers: bearer(firstAccessToken) })).response.status, 204, "cleanup race venue");

  const list = await request(`/v1/venues?search=${encodeURIComponent(token)}&minCapacity=750&maxCapacity=750&sortBy=capacity&order=asc&limit=20`);
  expectStatus(list.response.status, 200, "filtered venue list");
  if (!Array.isArray(list.body?.data) || list.body.data.length !== 1 || list.body.data[0]?.id !== id) throw new Error("filtered list did not return expected venue");

  expectStatus((await request(`/v1/venues/${id}`)).response.status, 200, "get venue");
  const updated = await request(`/v1/venues/${id}`, {
    method: "PATCH",
    headers: bearer(firstAccessToken),
    body: JSON.stringify({ capacity: 900 }),
  });
  expectStatus(updated.response.status, 200, "update venue");
  if (updated.body?.data?.capacity !== 900) throw new Error("updated capacity was not persisted");

  expectStatus((await request(`/v1/venues/${id}`, { method: "DELETE", headers: bearer(firstAccessToken) })).response.status, 204, "delete venue");
  expectStatus((await request(`/v1/venues/${id}`)).response.status, 404, "get deleted venue");

  expectStatus((await request("/v1/auth/logout-all", { method: "POST", headers: bearer(firstAccessToken) })).response.status, 204, "logout all sessions");
  expectStatus((await request("/v1/auth/me", { headers: bearer(firstAccessToken) })).response.status, 401, "reject access token after logout-all");

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
