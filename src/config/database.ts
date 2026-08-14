import pg from "pg";
import { env } from "./env.js";
const { Pool } = pg;
export const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL, max: env.DB_POOL_MAX }) : null;
export async function databaseHealth(): Promise<boolean> { if (!pool) return true; await pool.query("SELECT 1"); return true; }
export async function closeDatabase(): Promise<void> { if (pool) await pool.end(); }
