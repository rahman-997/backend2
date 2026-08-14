import type { Pool } from "pg";
import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";
import type { VenueListQuery, VenueListResult, VenueRepository } from "./venue.repository.js";

const toVenue = (row: any): Venue => ({
  id: String(row.id),
  name: String(row.name),
  address: String(row.address),
  capacity: Number(row.capacity),
  contactEmail: String(row.contact_email),
  createdAt: new Date(row.created_at).toISOString(),
});

const sortColumns = {
  createdAt: "created_at",
  name: "name",
  address: "address",
  capacity: "capacity",
} as const;

export class PostgresVenueRepository implements VenueRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateVenueInput): Promise<Venue> {
    const r = await this.pool.query(
      "INSERT INTO venues (name,address,capacity,contact_email) VALUES ($1,$2,$3,$4) RETURNING *",
      [input.name, input.address, input.capacity, input.contactEmail],
    );
    return toVenue(r.rows[0]);
  }

  async list(q: VenueListQuery): Promise<VenueListResult> {
    const values: unknown[] = [];
    const filters: string[] = [];
    if (q.search) {
      values.push(`%${q.search}%`);
      filters.push(`(name ILIKE $${values.length} OR address ILIKE $${values.length})`);
    }
    if (q.minCapacity !== undefined) {
      values.push(q.minCapacity);
      filters.push(`capacity >= $${values.length}`);
    }
    if (q.maxCapacity !== undefined) {
      values.push(q.maxCapacity);
      filters.push(`capacity <= $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const count = await this.pool.query(`SELECT COUNT(*)::int total FROM venues ${where}`, values);
    const offset = (q.page - 1) * q.limit;
    const sortColumn = sortColumns[q.sortBy];
    const direction = q.order === "asc" ? "ASC" : "DESC";

    values.push(q.limit, offset);
    const r = await this.pool.query(
      `SELECT * FROM venues ${where} ORDER BY ${sortColumn} ${direction}, id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { data: r.rows.map(toVenue), total: Number(count.rows[0].total) };
  }

  async getById(id: string): Promise<Venue | null> {
    const r = await this.pool.query("SELECT * FROM venues WHERE id=$1", [id]);
    return r.rows[0] ? toVenue(r.rows[0]) : null;
  }

  async findByNormalizedName(name: string, excludeId?: string): Promise<Venue | null> {
    const values: unknown[] = [name.trim()];
    let sql = "SELECT * FROM venues WHERE lower(name)=lower($1)";
    if (excludeId) {
      values.push(excludeId);
      sql += " AND id<>$2";
    }
    const r = await this.pool.query(`${sql} LIMIT 1`, values);
    return r.rows[0] ? toVenue(r.rows[0]) : null;
  }

  async update(id: string, input: UpdateVenueInput): Promise<Venue | null> {
    const map: Record<string, string> = { name: "name", address: "address", capacity: "capacity", contactEmail: "contact_email" };
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(input)) {
      fields.push(`${map[key]}=$${values.length + 1}`);
      values.push(value);
    }
    if (!fields.length) return this.getById(id);
    values.push(id);
    const r = await this.pool.query(
      `UPDATE venues SET ${fields.join(",")},updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values,
    );
    return r.rows[0] ? toVenue(r.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const r = await this.pool.query("DELETE FROM venues WHERE id=$1", [id]);
    return r.rowCount === 1;
  }

  async health(): Promise<boolean> {
    await this.pool.query("SELECT 1");
    return true;
  }
}
