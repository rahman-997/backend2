import { Pool } from "pg";
import { randomUUID } from "node:crypto";

describe("PostgreSQL integration", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const run = databaseUrl ? describe : describe.skip;

  run("when DATABASE_URL is configured", () => {
    const pool = new Pool({ connectionString: databaseUrl });

    afterAll(async () => {
      await pool.end();
    });

    it("connects and exposes the venues table", async () => {
      const result = await pool.query<{ exists: boolean }>(
        "SELECT to_regclass('public.venues') IS NOT NULL AS exists",
      );
      expect(result.rows[0]?.exists).toBe(true);
    });

    it("enforces the unique venue name constraint", async () => {
      const name = `ci-${randomUUID()}`;
      await pool.query(
        "INSERT INTO venues (id, name, address, capacity, contact_email, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
        [randomUUID(), name, "CI", 100, `ci-${randomUUID()}@example.com`],
      );

      await expect(
        pool.query(
          "INSERT INTO venues (id, name, address, capacity, contact_email, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
          [randomUUID(), name, "CI", 200, `ci-${randomUUID()}@example.com`],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    });
  });
});
