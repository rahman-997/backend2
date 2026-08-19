import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../../config/env.js";
import type { AuthPrincipal, UserRecord } from "./auth.types.js";

const JWT_ISSUER = "backend2";
const JWT_AUDIENCE = "backend2-api";
const DEV_SECRET = "backend2-development-only-jwt-secret-change-me";

function jwtKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET ?? DEV_SECRET);
}

function scryptAsync(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltEncoded, hashEncoded] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) return false;

  const salt = Buffer.from(saltEncoded, "base64url");
  const expected = Buffer.from(hashEncoded, "base64url");
  const actual = await scryptAsync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function signAccessToken(user: UserRecord): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role, ver: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + env.ACCESS_TOKEN_TTL_SECONDS)
    .sign(jwtKey());
}

export async function verifyAccessToken(token: string): Promise<AuthPrincipal> {
  const { payload } = await jwtVerify(token, jwtKey(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithms: ["HS256"],
  });

  if (
    !payload.sub ||
    typeof payload.email !== "string" ||
    (payload.role !== "USER" && payload.role !== "ADMIN") ||
    typeof payload.ver !== "number" ||
    !Number.isInteger(payload.ver) ||
    payload.ver < 0
  ) {
    throw new Error("Invalid access token claims");
  }

  return { userId: payload.sub, email: payload.email, role: payload.role, tokenVersion: payload.ver };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
