import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.enum(["true", "false"]).default("true").transform((value) => value === "true");

const envSchema = z
  .strictObject({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    DATABASE_URL: z.url(),
    REDIS_URL: z.string().regex(/^rediss?:\/\//, "REDIS_URL must use redis:// or rediss://"),
    JWT_ACCESS_SECRET: z.string().min(32),
    WEB_ORIGIN: z.url(),
    WEB_ORIGINS: z.string().optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
    SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
    METRICS_ENABLED: booleanFromEnv,
    CACHE_LIST_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
    CACHE_DETAIL_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(120),
    CACHE_TTL_JITTER_PERCENT: z.coerce.number().int().min(0).max(50).default(10),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).default(10),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(86_400).default(900),
    LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).max(100).default(5),
    LOGIN_FAILURE_WINDOW_SECONDS: z.coerce.number().int().min(1).max(86_400).default(900),
    LOGIN_LOCK_SECONDS: z.coerce.number().int().min(1).max(86_400).default(300),
    EMAIL_MODE: z.enum(["log", "smtp"]).default("log"),
    SMTP_URL: z.string().optional(),
    EMAIL_FROM: z.string().min(3).default("Eventify <no-reply@eventify.local>"),
    OUTBOX_POLL_MS: z.coerce.number().int().min(500).max(60_000).default(2000),
    OUTBOX_IDLE_MAX_POLL_MS: z.coerce.number().int().min(500).max(60_000).default(15000),
    OUTBOX_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    WORKER_HEARTBEAT_TTL_SECONDS: z.coerce.number().int().min(10).max(300).default(45),
  })
  .refine(({ EMAIL_MODE, SMTP_URL }) => EMAIL_MODE !== "smtp" || Boolean(SMTP_URL), {
    message: "SMTP_URL is required when EMAIL_MODE=smtp",
    path: ["SMTP_URL"],
  });

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  WEB_ORIGINS: process.env.WEB_ORIGINS,
  TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS,
  REQUEST_TIMEOUT_MS: process.env.REQUEST_TIMEOUT_MS,
  SHUTDOWN_GRACE_MS: process.env.SHUTDOWN_GRACE_MS,
  METRICS_ENABLED: process.env.METRICS_ENABLED,
  CACHE_LIST_TTL_SECONDS: process.env.CACHE_LIST_TTL_SECONDS,
  CACHE_DETAIL_TTL_SECONDS: process.env.CACHE_DETAIL_TTL_SECONDS,
  CACHE_TTL_JITTER_PERCENT: process.env.CACHE_TTL_JITTER_PERCENT,
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_SECONDS: process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
  LOGIN_MAX_FAILURES: process.env.LOGIN_MAX_FAILURES,
  LOGIN_FAILURE_WINDOW_SECONDS: process.env.LOGIN_FAILURE_WINDOW_SECONDS,
  LOGIN_LOCK_SECONDS: process.env.LOGIN_LOCK_SECONDS,
  EMAIL_MODE: process.env.EMAIL_MODE,
  SMTP_URL: process.env.SMTP_URL,
  EMAIL_FROM: process.env.EMAIL_FROM,
  OUTBOX_POLL_MS: process.env.OUTBOX_POLL_MS,
  OUTBOX_IDLE_MAX_POLL_MS: process.env.OUTBOX_IDLE_MAX_POLL_MS,
  OUTBOX_RETENTION_DAYS: process.env.OUTBOX_RETENTION_DAYS,
  WORKER_HEARTBEAT_TTL_SECONDS: process.env.WORKER_HEARTBEAT_TTL_SECONDS,
});

const webOrigins = (parsed.WEB_ORIGINS ?? parsed.WEB_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

for (const origin of webOrigins) z.url().parse(origin);

export const config = Object.freeze({
  ...parsed,
  WEB_ORIGINS: webOrigins,
});
