import { createHash, randomUUID } from "node:crypto";
import { config } from "../config.js";
import { logger } from "../observability/logger.js";
import { recordCacheResult } from "../observability/metrics.js";
import { redis } from "../redis/client.js";
import { invalidateEventCache } from "./event-cache-invalidation.js";
import { EVENT_CACHE_LIST_VERSION_KEY, eventCacheDetailKey } from "./event-cache-keys.js";

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

function jitteredTtl(ttlSeconds: number): number {
  if (config.CACHE_TTL_JITTER_PERCENT === 0) return ttlSeconds;
  const range = ttlSeconds * (config.CACHE_TTL_JITTER_PERCENT / 100);
  const jitter = Math.round((Math.random() * 2 - 1) * range);
  return Math.max(1, ttlSeconds + jitter);
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) {
      recordCacheResult("miss");
      return null;
    }
    recordCacheResult("hit");
    return JSON.parse(raw) as T;
  } catch (error) {
    recordCacheResult("error");
    logger.warn("cache.read_failed", { key, error });
    return null;
  }
}

async function writeJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    // Every cache write has a bounded TTL; jitter avoids many hot keys expiring simultaneously.
    await redis.set(key, JSON.stringify(value), "EX", jitteredTtl(ttlSeconds));
  } catch (error) {
    recordCacheResult("error");
    logger.warn("cache.write_failed", { key, error });
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
    recordCacheResult("error");
    // Redis is an optimization; PostgreSQL remains the source of truth.
  }

  if (!ownsLock) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await sleep(40 * 2 ** attempt);
      const filled = await readJson<T>(key);
      if (filled !== null) return filled;
    }
    recordCacheResult("load");
    return loader();
  }

  try {
    // Double-check after winning the lock in case another request filled the key.
    const filled = await readJson<T>(key);
    if (filled !== null) return filled;
    recordCacheResult("load");
    const value = await loader();
    await writeJson(key, value, ttlSeconds);
    return value;
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
    } catch (error) {
      logger.debug("cache.lock_release_failed", { key, error });
    }
  }
}

export const eventCache = {
  async list<T>(query: unknown, loader: () => Promise<T>): Promise<T> {
    let version = "0";
    try {
      version = (await redis.get(EVENT_CACHE_LIST_VERSION_KEY)) ?? "0";
    } catch {
      recordCacheResult("error");
    }
    const key = `eventify:cache:events:list:${version}:${queryDigest(query)}`;
    return cacheAside(key, config.CACHE_LIST_TTL_SECONDS, loader);
  },

  detail<T>(id: string, loader: () => Promise<T>): Promise<T> {
    return cacheAside(eventCacheDetailKey(id), config.CACHE_DETAIL_TTL_SECONDS, loader);
  },

  async invalidateCollection(): Promise<void> {
    try {
      await redis.incr(EVENT_CACHE_LIST_VERSION_KEY);
    } catch (error) {
      recordCacheResult("error");
      logger.warn("cache.collection_invalidation_failed", { error });
    }
  },

  async invalidateEvent(id: string): Promise<void> {
    try {
      await invalidateEventCache(redis, id);
    } catch (error) {
      recordCacheResult("error");
      logger.warn("cache.event_invalidation_failed", { eventId: id, error });
    }
  },
};
