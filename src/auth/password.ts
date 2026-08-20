import * as argon2 from "argon2";
import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

async function verifyLegacyScrypt(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  if (expected.length === 0) return false;
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith("$argon2")) return await argon2.verify(stored, password);
    if (stored.startsWith("scrypt$")) return await verifyLegacyScrypt(password, stored);
    return false;
  } catch {
    // Corrupt hashes are authentication failures, never information-leaking 500s.
    return false;
  }
}

export function needsPasswordRehash(stored: string): boolean {
  if (!stored.startsWith("$argon2id$")) return true;
  try {
    return argon2.needsRehash(stored, ARGON2_OPTIONS);
  } catch {
    return true;
  }
}

const dummyHashPromise = hashPassword("Eventify dummy credential for timing equalization only");
export function getDummyPasswordHash(): Promise<string> {
  return dummyHashPromise;
}
