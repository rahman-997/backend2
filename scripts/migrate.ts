import { readdir, readFile } from "node:fs/promises";
import { pool } from "../src/config/database.js";

if (!pool) throw new Error("DATABASE_URL is required");

const migrationsUrl = new URL("../migrations/", import.meta.url);
const files = (await readdir(migrationsUrl))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

for (const filename of files) {
  const existing = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]);
  if (existing.rowCount) continue;

  const sql = await readFile(new URL(filename, migrationsUrl), "utf8");
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await pool.query("COMMIT");
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

await pool.end();
console.log("Database migrations completed");
