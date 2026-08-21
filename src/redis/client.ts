import { Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "../observability/logger.js";
import { WORKER_HEARTBEAT_KEY } from "./keys.js";

function baseOptions(connectionName: string) {
  return {
    connectionName,
    connectTimeout: 3_000,
    enableReadyCheck: true,
    keepAlive: 10_000,
    retryStrategy(times: number) {
      return Math.min(100 * 2 ** Math.min(times - 1, 5), 3_000);
    },
  } as const;
}

export const redis = new Redis(config.REDIS_URL, {
  ...baseOptions("eventify-api"),
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on("error", (error: Error) => {
  logger.warn("redis.connection_error", { message: error.message });
});
redis.on("ready", () => logger.info("redis.ready"));

export async function redisHealth(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

export async function workerHeartbeatHealth(): Promise<boolean> {
  try {
    return Boolean(await redis.get(WORKER_HEARTBEAT_KEY));
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}
