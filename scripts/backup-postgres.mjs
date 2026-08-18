import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = resolve(process.argv[2] ?? `backups/backend2-${timestamp}.dump`);
mkdirSync(dirname(output), { recursive: true });

const result = spawnSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-privileges", "--file", output, databaseUrl],
  { stdio: "inherit" },
);

if (result.error) {
  if (result.error.code === "ENOENT") {
    throw new Error("pg_dump was not found. Install PostgreSQL client tools and ensure pg_dump is in PATH.");
  }
  throw result.error;
}
if (result.status !== 0) throw new Error(`pg_dump failed with exit code ${result.status}`);

console.log(`Backup created: ${output}`);
