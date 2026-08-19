import mysql from "mysql2/promise";

const rawUrl = process.env.MYSQL_URL;
if (!rawUrl) throw new Error("MYSQL_URL is required");

const url = new URL(rawUrl);
if (url.protocol !== "mysql:") throw new Error("MYSQL_URL must use mysql://");
const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!database) throw new Error("MYSQL_URL must include a database name");

const pool = mysql.createPool({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database,
  connectionLimit: 2,
  timezone: "Z",
});

const fail = (message) => { throw new Error(`MySQL database contract failed: ${message}`); };

async function columnsFor(tableName) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, COLLATION_NAME
       FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ORDINAL_POSITION`,
    [database, tableName],
  );
  return new Map(columns.map((column) => [column.COLUMN_NAME, column]));
}

try {
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND TABLE_NAME IN ('venues','users','refresh_tokens','audit_logs')`,
    [database],
  );
  const tableNames = new Set(tables.map((row) => row.TABLE_NAME));
  for (const table of ["venues", "users", "refresh_tokens", "audit_logs"]) {
    if (!tableNames.has(table)) fail(`missing table ${table}`);
  }

  const byName = await columnsFor("venues");
  for (const name of ["id", "name", "address", "capacity", "contact_email", "created_at", "updated_at", "owner_user_id"]) {
    if (!byName.has(name)) fail(`missing venues.${name}`);
  }

  const id = byName.get("id");
  if (id.DATA_TYPE !== "char" || Number(id.CHARACTER_MAXIMUM_LENGTH) !== 36) fail("venues.id must be CHAR(36)");
  const name = byName.get("name");
  if (name.DATA_TYPE !== "varchar" || Number(name.CHARACTER_MAXIMUM_LENGTH) !== 255) fail("venues.name must be VARCHAR(255)");
  if (String(name.COLLATION_NAME ?? "").toLowerCase() !== "utf8mb4_0900_as_ci") fail("venues.name must use utf8mb4_0900_as_ci collation");
  const address = byName.get("address");
  if (address.DATA_TYPE !== "varchar" || Number(address.CHARACTER_MAXIMUM_LENGTH) !== 2000) fail("venues.address must be VARCHAR(2000)");
  if (byName.get("capacity").DATA_TYPE !== "int") fail("venues.capacity must be INT");
  const email = byName.get("contact_email");
  if (email.DATA_TYPE !== "varchar" || Number(email.CHARACTER_MAXIMUM_LENGTH) !== 320) fail("venues.contact_email must be VARCHAR(320)");
  if (byName.get("owner_user_id").DATA_TYPE !== "char" || Number(byName.get("owner_user_id").CHARACTER_MAXIMUM_LENGTH) !== 36) fail("venues.owner_user_id must be CHAR(36)");
  for (const timestampName of ["created_at", "updated_at"]) {
    if (byName.get(timestampName).DATA_TYPE !== "timestamp") fail(`venues.${timestampName} must be TIMESTAMP`);
  }

  const [indexes] = await pool.query(
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME FROM information_schema.statistics WHERE table_schema = ? AND table_name = 'venues'`,
    [database],
  );
  const hasNamedIndex = (indexName, columnName, unique = false) => indexes.some((index) => index.INDEX_NAME === indexName && index.COLUMN_NAME === columnName && (!unique || Number(index.NON_UNIQUE) === 0));
  const hasUniqueIndexOn = (columnName) => indexes.some((index) => index.COLUMN_NAME === columnName && Number(index.NON_UNIQUE) === 0);
  if (!hasNamedIndex("PRIMARY", "id", true)) fail("missing venues primary key on id");
  if (!hasUniqueIndexOn("name")) fail("missing unique index on venues.name");
  if (!hasNamedIndex("venues_created_at_idx", "created_at")) fail("missing venues.created_at index");
  if (!hasNamedIndex("venues_capacity_idx", "capacity")) fail("missing venues.capacity index");
  if (!hasNamedIndex("venues_owner_user_id_idx", "owner_user_id")) fail("missing venues.owner_user_id index");

  const [checks] = await pool.query(
    `SELECT cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
       FROM information_schema.check_constraints cc
       JOIN information_schema.table_constraints tc
         ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = 'venues' AND tc.CONSTRAINT_TYPE = 'CHECK'`,
    [database],
  );
  const capacityCheck = checks.find((check) => check.CONSTRAINT_NAME === "venues_capacity_positive");
  if (!capacityCheck || !/`?capacity`?\s*>\s*0/i.test(String(capacityCheck.CHECK_CLAUSE))) fail("missing positive-capacity CHECK constraint");

  const users = await columnsFor("users");
  for (const name of ["id", "name", "email", "password_hash", "role", "is_active", "token_version", "created_at", "updated_at"]) {
    if (!users.has(name)) fail(`missing users.${name}`);
  }
  if (!['tinyint','boolean'].includes(users.get("is_active").DATA_TYPE)) fail("users.is_active must be boolean-compatible");
  if (users.get("token_version").DATA_TYPE !== "int") fail("users.token_version must be INT");

  const refresh = await columnsFor("refresh_tokens");
  for (const name of ["id", "user_id", "token_hash", "expires_at", "revoked_at", "created_at"]) {
    if (!refresh.has(name)) fail(`missing refresh_tokens.${name}`);
  }

  const audit = await columnsFor("audit_logs");
  for (const name of ["id", "actor_user_id", "action", "resource_type", "resource_id", "metadata", "created_at"]) {
    if (!audit.has(name)) fail(`missing audit_logs.${name}`);
  }
  if (audit.get("metadata").DATA_TYPE !== "json") fail("audit_logs.metadata must be JSON");

  const [auditIndexes] = await pool.query(
    `SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.statistics WHERE table_schema = ? AND table_name = 'audit_logs'`,
    [database],
  );
  if (!auditIndexes.some((row) => row.INDEX_NAME === "audit_logs_created_at_idx" && row.COLUMN_NAME === "created_at")) fail("missing audit_logs.created_at index");
  if (!auditIndexes.some((row) => row.INDEX_NAME === "audit_logs_actor_user_id_idx" && row.COLUMN_NAME === "actor_user_id")) fail("missing audit_logs.actor_user_id index");

  console.log("MySQL database contract validation passed");
} finally {
  await pool.end();
}
