import mysql from "mysql2/promise";
import pg from "pg";
import { env } from "./env.js";

const { Pool: PgPool } = pg;

function parseMysqlUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "mysql:") {
    throw new Error("MYSQL_URL must use the mysql:// protocol");
  }

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

export const postgresPool =
  env.STORAGE === "postgres" && env.DATABASE_URL
    ? new PgPool({ connectionString: env.DATABASE_URL, max: env.DB_POOL_MAX })
    : null;

export const mysqlPool =
  env.STORAGE === "mysql" && env.MYSQL_URL
    ? mysql.createPool({
        ...parseMysqlUrl(env.MYSQL_URL),
        connectionLimit: env.DB_POOL_MAX,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
      })
    : null;

export async function databaseHealth(): Promise<boolean> {
  if (postgresPool) {
    await postgresPool.query("SELECT 1");
    return true;
  }

  if (mysqlPool) {
    await mysqlPool.query("SELECT 1");
    return true;
  }

  return true;
}

export async function closeDatabase(): Promise<void> {
  await Promise.all([
    postgresPool ? postgresPool.end() : Promise.resolve(),
    mysqlPool ? mysqlPool.end() : Promise.resolve(),
  ]);
}

export { parseMysqlUrl };
