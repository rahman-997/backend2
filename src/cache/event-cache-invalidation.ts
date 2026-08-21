import type { Redis } from "ioredis";
import { EVENT_CACHE_LIST_VERSION_KEY, eventCacheDetailKey } from "./event-cache-keys.js";

export async function invalidateEventCache(connection: Redis, id: string): Promise<void> {
  await connection.multi().del(eventCacheDetailKey(id)).incr(EVENT_CACHE_LIST_VERSION_KEY).exec();
}
