import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (process.env.CONFIRM_RESTORE !== "yes") {
  throw new Error("Restore is destructive. Set CONFIRM_RESTORE=yes to continue.");
}

const inputArg = process.argv[2];
if (!inputArg) throw new Error("Usage: npm run db:restore -- path/to/backup.dump");
const input = resolve(inputArg);
if (!existsSync(input)) throw new Error(`Backup file not found: ${input}`);

const result = spawnSync(
  "pg_restore",
  ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", databaseUrl, input],
  { stdio: "inherit" },
);

if (result.error) {
  if (result.error.code === "ENOENT") {
    throw new Error("pg_restore was not found. Install PostgreSQL client tools and ensure pg_restore is in PATH.");
  }
  throw result.error;
}
if (result.status !== 0) throw new Error(`pg_restore failed with exit code ${result.status}`);

console.log(`Restore completed from: ${input}`);
