import { readFile } from "node:fs/promises";
import { pool } from "../config/database.js";
if (!pool) throw new Error("DATABASE_URL is required");
const sql=await readFile(new URL("../../migrations/001_create_venues.sql",import.meta.url),"utf8");
await pool.query(sql); await pool.end(); console.log("Database migration completed");
