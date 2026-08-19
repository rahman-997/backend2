import { randomUUID } from "node:crypto";
import type { Pool as MysqlPool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { Pool as PgPool } from "pg";
import { mysqlPool, postgresPool } from "../../config/database.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../errors/HttpError.js";
import type { RefreshTokenRecord, User, UserRecord, UserRole } from "./auth.types.js";

export interface CreateUserRecordInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface StoreRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}

export interface AuthRepository {
  createUser(input: CreateUserRecordInput): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  listUsers(): Promise<User[]>;
  storeRefreshToken(input: StoreRefreshTokenInput): Promise<RefreshTokenRecord>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role === "ADMIN" ? "ADMIN" : "USER",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function safeUser(user: UserRecord): User {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function mapRefresh(row: Record<string, unknown>): RefreshTokenRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: iso(row.expires_at),
    revokedAt: row.revoked_at ? iso(row.revoked_at) : null,
    createdAt: iso(row.created_at),
  };
}

class MemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  async createUser(input: CreateUserRecordInput): Promise<UserRecord> {
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase();
    return [...this.users.values()].find((user) => user.email.toLowerCase() === normalized) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async listUsers(): Promise<User[]> {
    return [...this.users.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(safeUser);
  }

  async storeRefreshToken(input: StoreRefreshTokenInput): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.refreshTokens.set(record.tokenHash, record);
    return record;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const record = this.refreshTokens.get(tokenHash);
    if (record && !record.revokedAt) record.revokedAt = new Date().toISOString();
  }
}

class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly pool: PgPool) {}

  async createUser(input: CreateUserRecordInput): Promise<UserRecord> {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, password_hash, role, created_at, updated_at`,
      [id, input.name, input.email, input.passwordHash, input.role],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new HttpError(500, "Failed to create user");
    return mapUser(row);
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  }

  async listUsers(): Promise<User[]> {
    const result = await this.pool.query(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT 100`,
    );
    return result.rows.map((row) => safeUser(mapUser(row as Record<string, unknown>)));
  }

  async storeRefreshToken(input: StoreRefreshTokenInput): Promise<RefreshTokenRecord> {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at`,
      [id, input.userId, input.tokenHash, input.expiresAt],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new HttpError(500, "Failed to create refresh token");
    return mapRefresh(row);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapRefresh(row) : null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = $1`,
      [tokenHash],
    );
  }
}

interface MysqlUserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface MysqlRefreshRow extends RowDataPacket {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  created_at: Date | string;
}

class MySqlAuthRepository implements AuthRepository {
  constructor(private readonly pool: MysqlPool) {}

  async createUser(input: CreateUserRecordInput): Promise<UserRecord> {
    const id = randomUUID();
    await this.pool.execute<ResultSetHeader>(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [id, input.name, input.email, input.passwordHash, input.role],
    );
    const user = await this.findUserById(id);
    if (!user) throw new HttpError(500, "Failed to create user");
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [rows] = await this.pool.execute<MysqlUserRow[]>(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email],
    );
    return rows[0] ? mapUser(rows[0] as unknown as Record<string, unknown>) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const [rows] = await this.pool.execute<MysqlUserRow[]>(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? mapUser(rows[0] as unknown as Record<string, unknown>) : null;
  }

  async listUsers(): Promise<User[]> {
    const [rows] = await this.pool.query<MysqlUserRow[]>(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT 100`,
    );
    return rows.map((row) => safeUser(mapUser(row as unknown as Record<string, unknown>)));
  }

  async storeRefreshToken(input: StoreRefreshTokenInput): Promise<RefreshTokenRecord> {
    const id = randomUUID();
    await this.pool.execute<ResultSetHeader>(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
      [id, input.userId, input.tokenHash, new Date(input.expiresAt)],
    );
    const [rows] = await this.pool.execute<MysqlRefreshRow[]>(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_tokens WHERE id = ? LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new HttpError(500, "Failed to create refresh token");
    return mapRefresh(row as unknown as Record<string, unknown>);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const [rows] = await this.pool.execute<MysqlRefreshRow[]>(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ? mapRefresh(rows[0] as unknown as Record<string, unknown>) : null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.pool.execute<ResultSetHeader>(
      `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)) WHERE token_hash = ?`,
      [tokenHash],
    );
  }
}

export const authRepository: AuthRepository = (() => {
  switch (env.STORAGE) {
    case "postgres":
      if (!postgresPool) throw new HttpError(500, "PostgreSQL pool is not configured");
      return new PostgresAuthRepository(postgresPool);
    case "mysql":
      if (!mysqlPool) throw new HttpError(500, "MySQL pool is not configured");
      return new MySqlAuthRepository(mysqlPool);
    case "memory":
    default:
      return new MemoryAuthRepository();
  }
})();
