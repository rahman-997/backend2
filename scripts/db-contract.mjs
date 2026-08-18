import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database contract validation");

const pool = new Pool({ connectionString, max: 2 });

const fail = (message) => {
  throw new Error(`Database contract mismatch: ${message}`);
};

try {
  const table = await pool.query("SELECT to_regclass('public.venues') AS name");
  if (table.rows[0]?.name !== "venues") fail("public.venues table is missing");

  const columns = await pool.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'venues'
    ORDER BY ordinal_position
  `);

  const byName = new Map(columns.rows.map((column) => [column.column_name, column]));
  const required = {
    id: { type: "uuid", nullable: "NO" },
    name: { type: "character varying", max: 255, nullable: "NO" },
    address: { type: "text", nullable: "NO" },
    capacity: { type: "integer", nullable: "NO" },
    contact_email: { type: "character varying", max: 320, nullable: "NO" },
    created_at: { type: "timestamp with time zone", nullable: "NO" },
    updated_at: { type: "timestamp with time zone", nullable: "NO" },
  };

  for (const [name, expectation] of Object.entries(required)) {
    const column = byName.get(name);
    if (!column) fail(`missing column ${name}`);
    if (column.data_type !== expectation.type) fail(`${name} expected ${expectation.type}, got ${column.data_type}`);
    if (column.is_nullable !== expectation.nullable) fail(`${name} nullability is incorrect`);
    if (expectation.max !== undefined && Number(column.character_maximum_length) !== expectation.max) {
      fail(`${name} expected max length ${expectation.max}`);
    }
  }

  const idDefault = String(byName.get("id")?.column_default ?? "");
  if (!idDefault.includes("gen_random_uuid")) fail("id must default to gen_random_uuid()");

  const createdDefault = String(byName.get("created_at")?.column_default ?? "").toLowerCase();
  const updatedDefault = String(byName.get("updated_at")?.column_default ?? "").toLowerCase();
  if (!createdDefault.includes("now()")) fail("created_at must default to now()");
  if (!updatedDefault.includes("now()")) fail("updated_at must default to now()");

  const checks = await pool.query(`
    SELECT pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'venues' AND c.contype = 'c'
  `);
  if (!checks.rows.some((row) => /capacity\s*>\s*0/i.test(String(row.definition)))) {
    fail("positive capacity CHECK constraint is missing");
  }

  const indexes = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'venues'
  `);
  const indexDefs = indexes.rows.map((row) => `${row.indexname} ${row.indexdef}`.toLowerCase());

  if (!indexDefs.some((value) => value.includes("unique") && value.includes("lower") && value.includes("name"))) {
    fail("case-insensitive unique venue-name index is missing");
  }
  if (!indexDefs.some((value) => value.includes("capacity"))) fail("capacity index is missing");
  if (!indexDefs.some((value) => value.includes("created_at"))) fail("created_at index is missing");

  console.log("Database contract validation passed");
} finally {
  await pool.end();
}
