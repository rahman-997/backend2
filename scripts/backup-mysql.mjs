import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rawUrl = process.env.MYSQL_URL;
if (!rawUrl) throw new Error("MYSQL_URL is required");

const url = new URL(rawUrl);
if (url.protocol !== "mysql:") throw new Error("MYSQL_URL must use mysql://");
const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!database) throw new Error("MYSQL_URL must include a database name");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = resolve(process.argv[2] ?? `backups/backend2-mysql-${timestamp}.sql`);
mkdirSync(dirname(output), { recursive: true });

const fd = openSync(output, "w");
try {
  const result = spawnSync(
    "mysqldump",
    [
      `--host=${url.hostname}`,
      `--port=${url.port || "3306"}`,
      `--user=${decodeURIComponent(url.username)}`,
      "--single-transaction",
      "--skip-lock-tables",
      "--no-tablespaces",
      "--routines",
      "--triggers",
      "--events",
      database,
    ],
    {
      env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
      stdio: ["ignore", fd, "inherit"],
    },
  );

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error("mysqldump was not found. Install MySQL client tools and ensure mysqldump is in PATH.");
    }
    throw result.error;
  }

  if (result.status !== 0) throw new Error(`mysqldump failed with exit code ${result.status}`);
} finally {
  closeSync(fd);
}

console.log(`MySQL backup created: ${output}`);
