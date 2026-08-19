import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database contract validation");

const pool = new Pool({ connectionString, max: 2 });
const fail = (message) => { throw new Error(`Database contract mismatch: ${message}`); };

async function columnsFor(tableName) {
  const result = await pool.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return new Map(result.rows.map((column) => [column.column_name, column]));
}

try {
  const tables = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [["venues", "users", "refresh_tokens", "audit_logs"]],
  );
  const tableNames = new Set(tables.rows.map((row) => row.tablename));
  for (const table of ["venues", "users", "refresh_tokens", "audit_logs"]) {
    if (!tableNames.has(table)) fail(`public.${table} table is missing`);
  }

  const byName = await columnsFor("venues");
  const required = {
    id: { type: "uuid", nullable: "NO" },
    name: { type: "character varying", max: 255, nullable: "NO" },
    address: { type: "text", nullable: "NO" },
    capacity: { type: "integer", nullable: "NO" },
    contact_email: { type: "character varying", max: 320, nullable: "NO" },
    created_at: { type: "timestamp with time zone", nullable: "NO" },
    updated_at: { type: "timestamp with time zone", nullable: "NO" },
    owner_user_id: { type: "uuid", nullable: "YES" },
  };

  for (const [name, expectation] of Object.entries(required)) {
    const column = byName.get(name);
    if (!column) fail(`missing venues.${name}`);
    if (column.data_type !== expectation.type) fail(`venues.${name} expected ${expectation.type}, got ${column.data_type}`);
    if (column.is_nullable !== expectation.nullable) fail(`venues.${name} nullability is incorrect`);
    if (expectation.max !== undefined && Number(column.character_maximum_length) !== expectation.max) fail(`venues.${name} expected max length ${expectation.max}`);
  }

  const idDefault = String(byName.get("id")?.column_default ?? "");
  if (!idDefault.includes("gen_random_uuid")) fail("venues.id must default to gen_random_uuid()");
  if (!String(byName.get("created_at")?.column_default ?? "").toLowerCase().includes("now()")) fail("venues.created_at must default to now()");
  if (!String(byName.get("updated_at")?.column_default ?? "").toLowerCase().includes("now()")) fail("venues.updated_at must default to now()");

  const checks = await pool.query(`
    SELECT pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'venues' AND c.contype = 'c'
  `);
  if (!checks.rows.some((row) => /capacity\s*>\s*0/i.test(String(row.definition)))) fail("positive capacity CHECK constraint is missing");

  const indexes = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'venues'`);
  const indexDefs = indexes.rows.map((row) => `${row.indexname} ${row.indexdef}`.toLowerCase());
  if (!indexDefs.some((value) => value.includes("unique") && value.includes("lower") && value.includes("name"))) fail("case-insensitive unique venue-name index is missing");
  if (!indexDefs.some((value) => value.includes("capacity"))) fail("capacity index is missing");
  if (!indexDefs.some((value) => value.includes("created_at"))) fail("created_at index is missing");
  if (!indexDefs.some((value) => value.includes("owner_user_id"))) fail("owner_user_id index is missing");

  const users = await columnsFor("users");
  for (const name of ["id", "name", "email", "password_hash", "role", "is_active", "token_version", "created_at", "updated_at"]) {
    if (!users.has(name)) fail(`missing users.${name}`);
  }
  if (users.get("is_active")?.data_type !== "boolean") fail("users.is_active must be boolean");
  if (users.get("token_version")?.data_type !== "integer") fail("users.token_version must be integer");

  const refresh = await columnsFor("refresh_tokens");
  for (const name of ["id", "user_id", "token_hash", "expires_at", "revoked_at", "created_at"]) {
    if (!refresh.has(name)) fail(`missing refresh_tokens.${name}`);
  }

  const audit = await columnsFor("audit_logs");
  for (const name of ["id", "actor_user_id", "action", "resource_type", "resource_id", "metadata", "created_at"]) {
    if (!audit.has(name)) fail(`missing audit_logs.${name}`);
  }
  if (audit.get("metadata")?.data_type !== "jsonb") fail("audit_logs.metadata must be jsonb");

  const auditIndexes = await pool.query(`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='audit_logs'`);
  const auditDefs = auditIndexes.rows.map((row) => String(row.indexdef).toLowerCase());
  if (!auditDefs.some((value) => value.includes("created_at"))) fail("audit_logs created_at index is missing");
  if (!auditDefs.some((value) => value.includes("actor_user_id"))) fail("audit_logs actor_user_id index is missing");

  console.log("Database contract validation passed");
} finally {
  await pool.end();
}
