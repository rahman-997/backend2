import type { Pool } from "pg";
import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";
import type { VenueListQuery, VenueListResult, VenueRepository } from "./venue.repository.js";

const toVenue = (row: any): Venue => ({
  id: String(row.id),
  name: String(row.name),
  address: String(row.address),
  capacity: Number(row.capacity),
  contactEmail: String(row.contact_email),
  ownerUserId: row.owner_user_id == null ? null : String(row.owner_user_id),
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

  async create(input: CreateVenueInput, ownerUserId: string): Promise<Venue> {
    const r = await this.pool.query(
      "INSERT INTO venues (name,address,capacity,contact_email,owner_user_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [input.name, input.address, input.capacity, input.contactEmail, ownerUserId],
    );
    return toVenue(r.rows[0]);
  }

  async list(q: VenueListQuery): Promise<VenueListResult> {
    const filterValues: unknown[] = [];
    const filters: string[] = [];

    if (q.search !== undefined) {
      const search = q.search.trim();
      if (search.length > 0) {
        const pattern = `%${search}%`;
        filterValues.push(pattern, pattern);
        filters.push(`(LOWER(name) LIKE LOWER($${filterValues.length - 1}) OR LOWER(address) LIKE LOWER($${filterValues.length}))`);
      }
    }

    if (q.minCapacity !== undefined) {
      filterValues.push(q.minCapacity);
      filters.push(`capacity >= $${filterValues.length}`);
    }
    if (q.maxCapacity !== undefined) {
      filterValues.push(q.maxCapacity);
      filters.push(`capacity <= $${filterValues.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const count = await this.pool.query(`SELECT COUNT(*)::int total FROM venues ${where}`, filterValues);
    const offset = (q.page - 1) * q.limit;
    const sortColumn = sortColumns[q.sortBy];
    const direction = q.order === "asc" ? "ASC" : "DESC";

    const paginationValues = [...filterValues, q.limit, offset];
    const limitPosition = paginationValues.length - 1;
    const offsetPosition = paginationValues.length;
    const r = await this.pool.query(
      `SELECT * FROM venues ${where} ORDER BY ${sortColumn} ${direction}, id ASC LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
      paginationValues,
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
      const column = map[key];
      if (!column) continue;
      fields.push(`${column}=$${values.length + 1}`);
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
