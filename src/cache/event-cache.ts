import { createHash, randomUUID } from "node:crypto";
import { config } from "../config.js";
import { redis } from "../redis/client.js";

const LIST_VERSION_KEY = "eventify:cache:events:version";
const DETAIL_PREFIX = "eventify:cache:event:";
const LOCK_TTL_MS = 3_000;

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function queryDigest(query: unknown): string {
  return createHash("sha256").update(JSON.stringify(query)).digest("hex").slice(0, 24);
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error("[cache] read failed", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function writeJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    // Every cache write has a TTL. A cache key that never dies is a bug.
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error("[cache] write failed", error instanceof Error ? error.message : String(error));
  }
}

async function cacheAside<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await readJson<T>(key);
  if (cached !== null) return cached;

  const lockKey = `${key}:lock`;
  const token = randomUUID();
  let ownsLock = false;
  try {
    ownsLock = (await redis.set(lockKey, token, "PX", LOCK_TTL_MS, "NX")) === "OK";
  } catch {
    // Redis is an optimization here; the database remains the source of truth.
  }

  if (!ownsLock) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await sleep(50 * (attempt + 1));
      const filled = await readJson<T>(key);
      if (filled !== null) return filled;
    }
    return loader();
  }

  try {
    // Double-check after winning the lock: another request may have filled the key
    // between our first GET and SET NX.
    const filled = await readJson<T>(key);
    if (filled !== null) return filled;
    const value = await loader();
    await writeJson(key, value, ttlSeconds);
    return value;
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
    } catch {
      // The lock has a short TTL, so a failed cleanup cannot become permanent.
    }
  }
}

export const eventCache = {
  async list<T>(query: unknown, loader: () => Promise<T>): Promise<T> {
    let version = "0";
    try {
      version = (await redis.get(LIST_VERSION_KEY)) ?? "0";
    } catch {
      // cacheAside will fail open to the loader as well.
    }
    const key = `eventify:cache:events:list:${version}:${queryDigest(query)}`;
    return cacheAside(key, config.CACHE_LIST_TTL_SECONDS, loader);
  },

  detail<T>(id: string, loader: () => Promise<T>): Promise<T> {
    return cacheAside(`${DETAIL_PREFIX}${id}`, config.CACHE_DETAIL_TTL_SECONDS, loader);
  },

  async invalidateCollection(): Promise<void> {
    try {
      await redis.incr(LIST_VERSION_KEY);
    } catch (error) {
      console.error("[cache] collection invalidation failed", error instanceof Error ? error.message : String(error));
    }
  },

  async invalidateEvent(id: string): Promise<void> {
    try {
      await redis.multi().del(`${DETAIL_PREFIX}${id}`).incr(LIST_VERSION_KEY).exec();
    } catch (error) {
      console.error("[cache] event invalidation failed", error instanceof Error ? error.message : String(error));
    }
  },
};
