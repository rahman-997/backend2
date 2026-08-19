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
});

const fail = (message) => {
  throw new Error(`MySQL database contract failed: ${message}`);
};

try {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, COLLATION_NAME
       FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'venues'
      ORDER BY ORDINAL_POSITION`,
    [database],
  );

  const byName = new Map(columns.map((column) => [column.COLUMN_NAME, column]));
  const required = ["id", "name", "address", "capacity", "contact_email", "created_at", "updated_at"];
  for (const name of required) {
    if (!byName.has(name)) fail(`missing venues.${name}`);
  }

  const id = byName.get("id");
  if (id.DATA_TYPE !== "char" || Number(id.CHARACTER_MAXIMUM_LENGTH) !== 36) fail("id must be CHAR(36)");

  const name = byName.get("name");
  if (name.DATA_TYPE !== "varchar" || Number(name.CHARACTER_MAXIMUM_LENGTH) !== 255) fail("name must be VARCHAR(255)");
  if (!String(name.COLLATION_NAME ?? "").toLowerCase().endsWith("_ci")) fail("name must use a case-insensitive collation");

  const address = byName.get("address");
  if (address.DATA_TYPE !== "varchar" || Number(address.CHARACTER_MAXIMUM_LENGTH) !== 2000) fail("address must be VARCHAR(2000)");

  const capacity = byName.get("capacity");
  if (capacity.DATA_TYPE !== "int") fail("capacity must be INT");

  const email = byName.get("contact_email");
  if (email.DATA_TYPE !== "varchar" || Number(email.CHARACTER_MAXIMUM_LENGTH) !== 320) fail("contact_email must be VARCHAR(320)");

  for (const timestampName of ["created_at", "updated_at"]) {
    const timestamp = byName.get(timestampName);
    if (timestamp.DATA_TYPE !== "timestamp") fail(`${timestampName} must be TIMESTAMP`);
  }

  const [indexes] = await pool.query(
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
       FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = 'venues'`,
    [database],
  );

  const hasIndex = (indexName, columnName, unique = false) =>
    indexes.some(
      (index) =>
        index.INDEX_NAME === indexName &&
        index.COLUMN_NAME === columnName &&
        (!unique || Number(index.NON_UNIQUE) === 0),
    );

  if (!hasIndex("PRIMARY", "id", true)) fail("missing primary key on id");
  if (!hasIndex("venues_name_ci_unique", "name", true)) fail("missing case-insensitive unique name index");
  if (!hasIndex("venues_created_at_idx", "created_at")) fail("missing created_at index");
  if (!hasIndex("venues_capacity_idx", "capacity")) fail("missing capacity index");

  const [checks] = await pool.query(
    `SELECT cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
       FROM information_schema.check_constraints cc
       JOIN information_schema.table_constraints tc
         ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
        AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = 'venues' AND tc.CONSTRAINT_TYPE = 'CHECK'`,
    [database],
  );

  const capacityCheck = checks.find((check) => check.CONSTRAINT_NAME === "venues_capacity_positive");
  if (!capacityCheck || !/capacity\s*>\s*0/i.test(String(capacityCheck.CHECK_CLAUSE))) {
    fail("missing positive-capacity CHECK constraint");
  }

  console.log("MySQL database contract validation passed");
} finally {
  await pool.end();
}
