import { closeSync, existsSync, openSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rawUrl = process.env.MYSQL_URL;
if (!rawUrl) throw new Error("MYSQL_URL is required");
if (process.env.CONFIRM_RESTORE !== "yes") {
  throw new Error("Restore is destructive. Set CONFIRM_RESTORE=yes to continue.");
}

const inputArg = process.argv[2];
if (!inputArg) throw new Error("Usage: npm run db:restore:mysql -- path/to/backup.sql");
const input = resolve(inputArg);
if (!existsSync(input)) throw new Error(`Backup file not found: ${input}`);

const url = new URL(rawUrl);
if (url.protocol !== "mysql:") throw new Error("MYSQL_URL must use mysql://");
const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!database) throw new Error("MYSQL_URL must include a database name");

const fd = openSync(input, "r");
try {
  const result = spawnSync(
    "mysql",
    [
      `--host=${url.hostname}`,
      `--port=${url.port || "3306"}`,
      `--user=${decodeURIComponent(url.username)}`,
      database,
    ],
    {
      env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
      stdio: [fd, "inherit", "inherit"],
    },
  );

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error("mysql client was not found. Install MySQL client tools and ensure mysql is in PATH.");
    }
    throw result.error;
  }

  if (result.status !== 0) throw new Error(`mysql restore failed with exit code ${result.status}`);
} finally {
  closeSync(fd);
}

console.log(`MySQL restore completed from: ${input}`);
