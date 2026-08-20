import Redis from "ioredis";
import { config } from "../config.js";

export const redis = new Redis(config.REDIS_URL, {
  connectTimeout: 2_000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy(times) {
    return Math.min(times * 100, 2_000);
  },
});

redis.on("error", (error) => {
  console.error("[redis] connection error", error instanceof Error ? error.message : String(error));
});

export async function redisHealth(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
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

export function createQueueRedis(): Redis {
  const connection = new Redis(config.REDIS_URL, {
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  connection.on("error", (error) => console.error("[queue-redis]", error instanceof Error ? error.message : String(error)));
  return connection;
}

export function createWorkerRedis(): Redis {
  const connection = new Redis(config.REDIS_URL, {
    connectTimeout: 5_000,
    maxRetriesPerRequest: null,
  });
  connection.on("error", (error) => console.error("[worker-redis]", error instanceof Error ? error.message : String(error)));
  return connection;
}
