import { spawn } from "node:child_process";
import { migrationRetryDelay } from "./migration-backoff.mjs";

const MAX_MIGRATION_ATTEMPTS = Number(process.env.MIGRATION_MAX_ATTEMPTS ?? 6);
const RETRY_DELAY_MS = Number(process.env.MIGRATION_RETRY_DELAY_MS ?? 5000);
const RETRY_MAX_DELAY_MS = Number(process.env.MIGRATION_RETRY_MAX_DELAY_MS ?? 30000);
const RETRY_JITTER_RATIO = Number(process.env.MIGRATION_RETRY_JITTER_RATIO ?? 0.2);
const PRISMA_CLI = "node_modules/prisma/build/index.js";

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    child.on("exit", (code, signal) => resolve({ code, signal }));
    child.on("error", () => resolve({ code: 1, signal: null }));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let migrated = false;
for (let attempt = 1; attempt <= MAX_MIGRATION_ATTEMPTS; attempt += 1) {
  console.log(`[startup] Applying Prisma migrations (attempt ${attempt}/${MAX_MIGRATION_ATTEMPTS})`);
  const result = await run(process.execPath, [PRISMA_CLI, "migrate", "deploy"]);
  if (result.code === 0) {
    migrated = true;
    break;
  }

  if (attempt < MAX_MIGRATION_ATTEMPTS) {
    const retryDelayMs = migrationRetryDelay({
      attempt,
      baseDelayMs: RETRY_DELAY_MS,
      maxDelayMs: RETRY_MAX_DELAY_MS,
      jitterRatio: RETRY_JITTER_RATIO,
    });
    console.warn(`[startup] Migration attempt failed; retrying in ${retryDelayMs}ms`);
    await sleep(retryDelayMs);
  }
}

if (!migrated) {
  console.error("[startup] Prisma migrations failed after all retry attempts");
  process.exit(1);
}

console.log("[startup] Migrations ready; starting Eventify API");
const server = spawn(process.execPath, ["dist/server.js"], {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
