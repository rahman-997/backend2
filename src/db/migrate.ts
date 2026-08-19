import { readdir, readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import pg from "pg";
import { env } from "../config/env.js";

const { Pool: PgPool } = pg;

async function listMigrationFiles(directory: URL): Promise<string[]> {
  return (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function runPostgresMigrations(): Promise<void> {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for PostgreSQL migrations");

  const pool = new PgPool({ connectionString: env.DATABASE_URL, max: env.DB_POOL_MAX });
  const migrationsUrl = new URL("../../migrations/", import.meta.url);
  const files = await listMigrationFiles(migrationsUrl);

  try {
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
        console.log(`Applied PostgreSQL migration: ${filename}`);
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await pool.end();
  }
}

function mysqlConnectionOptions(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "mysql:") throw new Error("MYSQL_URL must use mysql://");

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("MYSQL_URL must include a database name");

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

async function runMysqlMigrations(): Promise<void> {
  if (!env.MYSQL_URL) throw new Error("MYSQL_URL is required for MySQL migrations");

  const connection = await mysql.createConnection({
    ...mysqlConnectionOptions(env.MYSQL_URL),
    multipleStatements: true,
  });
  const migrationsUrl = new URL("../../schema/mysql/", import.meta.url);
  const files = await listMigrationFiles(migrationsUrl);

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB
    `);

    for (const filename of files) {
      const [existing] = await connection.execute("SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1", [filename]);
      if (Array.isArray(existing) && existing.length > 0) continue;

      const sql = await readFile(new URL(filename, migrationsUrl), "utf8");
      await connection.query(sql);
      await connection.execute("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
      console.log(`Applied MySQL migration: ${filename}`);
    }
  } finally {
    await connection.end();
  }
}

switch (env.STORAGE) {
  case "postgres":
    await runPostgresMigrations();
    break;
  case "mysql":
    await runMysqlMigrations();
    break;
  case "memory":
    console.log("Memory storage selected; no database migrations required");
    break;
}

console.log("Database migrations completed");
