import { Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "../observability/logger.js";

const WORKER_HEARTBEAT_KEY = "eventify:worker:heartbeat";

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

export async function writeWorkerHeartbeat(connection: Redis): Promise<void> {
  await connection.set(
    WORKER_HEARTBEAT_KEY,
    new Date().toISOString(),
    "EX",
    config.WORKER_HEARTBEAT_TTL_SECONDS,
  );
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
    ...baseOptions("eventify-queue-producer"),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  connection.on("error", (error: Error) => logger.warn("queue_redis.connection_error", { message: error.message }));
  return connection;
}

export function createWorkerRedis(): Redis {
  const connection = new Redis(config.REDIS_URL, {
    ...baseOptions("eventify-worker"),
    maxRetriesPerRequest: null,
  });
  connection.on("error", (error: Error) => logger.warn("worker_redis.connection_error", { message: error.message }));
  return connection;
}
