import { randomUUID } from "node:crypto";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";
import type { VenueListQuery, VenueListResult, VenueRepository } from "./venue.repository.js";

type VenueRow = RowDataPacket & {
  id: string;
  name: string;
  address: string;
  capacity: number;
  contact_email: string;
  created_at: Date | string;
};

type CountRow = RowDataPacket & { total: number };

const toVenue = (row: VenueRow): Venue => ({
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

export class MySqlVenueRepository implements VenueRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateVenueInput): Promise<Venue> {
    const id = randomUUID();
    await this.pool.execute(
      "INSERT INTO venues (id, name, address, capacity, contact_email) VALUES (?, ?, ?, ?, ?)",
      [id, input.name, input.address, input.capacity, input.contactEmail],
    );

    const created = await this.getById(id);
    if (!created) throw new Error("MySQL insert succeeded but venue could not be reloaded");
    return created;
  }

  async list(q: VenueListQuery): Promise<VenueListResult> {
    const values: unknown[] = [];
    const filters: string[] = [];

    if (q.search !== undefined) {
      const search = q.search.trim();
      if (search.length > 0) {
        const pattern = `%${search}%`;
        values.push(pattern, pattern);
        filters.push("(name LIKE ? OR address LIKE ?)");
      }
    }

    if (q.minCapacity !== undefined) {
      values.push(q.minCapacity);
      filters.push("capacity >= ?");
    }

    if (q.maxCapacity !== undefined) {
      values.push(q.maxCapacity);
      filters.push("capacity <= ?");
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const [countRows] = await this.pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS total FROM venues ${where}`,
      values,
    );

    const offset = (q.page - 1) * q.limit;
    const sortColumn = sortColumns[q.sortBy];
    const direction = q.order === "asc" ? "ASC" : "DESC";
    const [rows] = await this.pool.execute<VenueRow[]>(
      `SELECT * FROM venues ${where} ORDER BY ${sortColumn} ${direction}, id ASC LIMIT ? OFFSET ?`,
      [...values, q.limit, offset],
    );

    return {
      data: rows.map(toVenue),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async getById(id: string): Promise<Venue | null> {
    const [rows] = await this.pool.execute<VenueRow[]>("SELECT * FROM venues WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? toVenue(rows[0]) : null;
  }

  async findByNormalizedName(name: string, excludeId?: string): Promise<Venue | null> {
    const values: unknown[] = [name.trim()];
    let sql = "SELECT * FROM venues WHERE LOWER(name) = LOWER(?)";

    if (excludeId) {
      sql += " AND id <> ?";
      values.push(excludeId);
    }

    const [rows] = await this.pool.execute<VenueRow[]>(`${sql} LIMIT 1`, values);
    return rows[0] ? toVenue(rows[0]) : null;
  }

  async update(id: string, input: UpdateVenueInput): Promise<Venue | null> {
    const columnMap = {
      name: "name",
      address: "address",
      capacity: "capacity",
      contactEmail: "contact_email",
    } as const;

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(input) as [keyof UpdateVenueInput, unknown][]) {
      const column = columnMap[key];
      if (!column) continue;
      fields.push(`${column} = ?`);
      values.push(value);
    }

    if (!fields.length) return this.getById(id);

    values.push(id);
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE venues SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      values,
    );

    if (result.affectedRows !== 1) return null;
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>("DELETE FROM venues WHERE id = ?", [id]);
    return result.affectedRows === 1;
  }

  async health(): Promise<boolean> {
    await this.pool.query("SELECT 1");
    return true;
  }
}
