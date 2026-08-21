import { Redis } from "ioredis";
import { config } from "../config.js";
import { workerLogger } from "../observability/logger.js";
import { WORKER_HEARTBEAT_KEY } from "./keys.js";

function workerOptions(connectionName: string) {
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

export function createQueueRedis(): Redis {
  const connection = new Redis(config.REDIS_URL, {
    ...workerOptions("eventify-queue-producer"),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  connection.on("error", (error: Error) => workerLogger.warn("queue_redis.connection_error", { message: error.message }));
  connection.on("ready", () => workerLogger.info("queue_redis.ready"));
  return connection;
}

export function createWorkerRedis(): Redis {
  const connection = new Redis(config.REDIS_URL, {
    ...workerOptions("eventify-worker"),
    maxRetriesPerRequest: null,
  });
  connection.on("error", (error: Error) => workerLogger.warn("worker_redis.connection_error", { message: error.message }));
  connection.on("ready", () => workerLogger.info("worker_redis.ready"));
  return connection;
}

export async function writeWorkerHeartbeat(connection: Redis): Promise<void> {
  await connection.set(
    WORKER_HEARTBEAT_KEY,
    new Date().toISOString(),
    "EX",
    config.WORKER_HEARTBEAT_TTL_SECONDS,
  );
}
