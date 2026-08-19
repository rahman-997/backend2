import { randomUUID } from "node:crypto";
import type { Pool as MysqlPool, RowDataPacket } from "mysql2/promise";
import type { Pool as PgPool } from "pg";
import { mysqlPool, postgresPool } from "../../config/database.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../errors/HttpError.js";
import type { AuditListQuery, AuditListResult, AuditLog, CreateAuditLogInput } from "./audit.types.js";

export interface AuditRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  list(query: AuditListQuery): Promise<AuditListResult>;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mapAudit(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
    action: String(row.action),
    resourceType: String(row.resource_type),
    resourceId: row.resource_id == null ? null : String(row.resource_id),
    metadata: parseMetadata(row.metadata),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

class MemoryAuditRepository implements AuditRepository {
  private readonly logs: AuditLog[] = [];

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const log: AuditLog = {
      id: randomUUID(),
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.logs.unshift(log);
    return log;
  }

  async list(query: AuditListQuery): Promise<AuditListResult> {
    let rows = [...this.logs];
    if (query.action) rows = rows.filter((log) => log.action === query.action);
    if (query.resourceType) rows = rows.filter((log) => log.resourceType === query.resourceType);
    if (query.actorUserId) rows = rows.filter((log) => log.actorUserId === query.actorUserId);
    const total = rows.length;
    const start = (query.page - 1) * query.limit;
    return { data: rows.slice(start, start + query.limit), total };
  }
}

class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly pool: PgPool) {}

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, actor_user_id, action, resource_type, resource_id, metadata, created_at`,
      [id, input.actorUserId ?? null, input.action, input.resourceType, input.resourceId ?? null, JSON.stringify(input.metadata ?? {})],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new HttpError(500, "Failed to write audit log");
    return mapAudit(row);
  }

  async list(query: AuditListQuery): Promise<AuditListResult> {
    const values: unknown[] = [];
    const filters: string[] = [];
    if (query.action) { values.push(query.action); filters.push(`action = $${values.length}`); }
    if (query.resourceType) { values.push(query.resourceType); filters.push(`resource_type = $${values.length}`); }
    if (query.actorUserId) { values.push(query.actorUserId); filters.push(`actor_user_id = $${values.length}`); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const count = await this.pool.query(`SELECT COUNT(*)::int AS total FROM audit_logs ${where}`, values);
    const offset = (query.page - 1) * query.limit;
    const rows = await this.pool.query(
      `SELECT id, actor_user_id, action, resource_type, resource_id, metadata, created_at
       FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, query.limit, offset],
    );
    return { data: rows.rows.map((row) => mapAudit(row as Record<string, unknown>)), total: Number(count.rows[0]?.total ?? 0) };
  }
}

interface MysqlAuditRow extends RowDataPacket {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: unknown;
  created_at: Date | string;
}
interface MysqlCountRow extends RowDataPacket { total: number; }

class MySqlAuditRepository implements AuditRepository {
  constructor(private readonly pool: MysqlPool) {}

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const id = randomUUID();
    await this.pool.execute(
      `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, metadata)
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [id, input.actorUserId ?? null, input.action, input.resourceType, input.resourceId ?? null, JSON.stringify(input.metadata ?? {})],
    );
    const [rows] = await this.pool.execute<MysqlAuditRow[]>(
      `SELECT id, actor_user_id, action, resource_type, resource_id, metadata, created_at
       FROM audit_logs WHERE id = ? LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new HttpError(500, "Failed to write audit log");
    return mapAudit(row as unknown as Record<string, unknown>);
  }

  async list(query: AuditListQuery): Promise<AuditListResult> {
    const values: Array<string | number> = [];
    const filters: string[] = [];
    if (query.action) { values.push(query.action); filters.push("action = ?"); }
    if (query.resourceType) { values.push(query.resourceType); filters.push("resource_type = ?"); }
    if (query.actorUserId) { values.push(query.actorUserId); filters.push("actor_user_id = ?"); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const [countRows] = await this.pool.execute<MysqlCountRow[]>(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, values);
    const offset = (query.page - 1) * query.limit;
    const [rows] = await this.pool.execute<MysqlAuditRow[]>(
      `SELECT id, actor_user_id, action, resource_type, resource_id, metadata, created_at
       FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ${query.limit} OFFSET ${offset}`,
      values,
    );
    return { data: rows.map((row) => mapAudit(row as unknown as Record<string, unknown>)), total: Number(countRows[0]?.total ?? 0) };
  }
}

export const auditRepository: AuditRepository = (() => {
  switch (env.STORAGE) {
    case "postgres":
      if (!postgresPool) throw new HttpError(500, "PostgreSQL pool is not configured");
      return new PostgresAuditRepository(postgresPool);
    case "mysql":
      if (!mysqlPool) throw new HttpError(500, "MySQL pool is not configured");
      return new MySqlAuditRepository(mysqlPool);
    case "memory":
    default:
      return new MemoryAuditRepository();
  }
})();
