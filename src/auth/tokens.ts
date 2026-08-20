import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { config } from "../config.js";

const accessPayloadSchema = z.strictObject({
  sub: z.string().min(1).max(128),
  role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
});

const key = new TextEncoder().encode(config.JWT_ACCESS_SECRET);

export type AuthUser = z.infer<typeof accessPayloadSchema>;

export async function signAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
  return accessPayloadSchema.parse({ sub: payload.sub, role: payload.role });
}

export function createRefreshToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
