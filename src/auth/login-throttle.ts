import { createHash } from "node:crypto";
import { config } from "../config.js";
import { HttpError } from "../errors/http-error.js";
import { redis } from "../redis/client.js";

const FAILURE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if count >= tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'EX', ARGV[3])
end
return count
`;

function accountKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function keys(email: string) {
  const hash = accountKey(email);
  return {
    failures: `eventify:login:failures:${hash}`,
    lock: `eventify:login:lock:${hash}`,
  };
}

export async function assertLoginAllowed(email: string): Promise<void> {
  const { lock } = keys(email);
  try {
    const ttl = await redis.ttl(lock);
    if (ttl > 0) throw new HttpError(429, "Too many login attempts. Try again later.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("[login-throttle] Redis unavailable; failing open", error instanceof Error ? error.message : String(error));
  }
}

export async function recordLoginFailure(email: string): Promise<void> {
  const { failures, lock } = keys(email);
  try {
    await redis.eval(
      FAILURE_SCRIPT,
      2,
      failures,
      lock,
      String(config.LOGIN_FAILURE_WINDOW_SECONDS),
      String(config.LOGIN_MAX_FAILURES),
      String(config.LOGIN_LOCK_SECONDS),
    );
  } catch (error) {
    console.error("[login-throttle] Could not record failure", error instanceof Error ? error.message : String(error));
  }
}

export async function clearLoginFailures(email: string): Promise<void> {
  const { failures, lock } = keys(email);
  try {
    await redis.del(failures, lock);
  } catch (error) {
    console.error("[login-throttle] Could not clear failures", error instanceof Error ? error.message : String(error));
  }
}
