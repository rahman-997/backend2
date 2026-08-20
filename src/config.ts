import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .strictObject({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    DATABASE_URL: z.url(),
    REDIS_URL: z.string().regex(/^rediss?:\/\//, "REDIS_URL must use redis:// or rediss://"),
    JWT_ACCESS_SECRET: z.string().min(32),
    WEB_ORIGIN: z.url(),
    CACHE_LIST_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
    CACHE_DETAIL_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).default(10),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(86_400).default(900),
    LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).max(100).default(5),
    LOGIN_FAILURE_WINDOW_SECONDS: z.coerce.number().int().min(1).max(86_400).default(900),
    LOGIN_LOCK_SECONDS: z.coerce.number().int().min(1).max(86_400).default(300),
    EMAIL_MODE: z.enum(["log", "smtp"]).default("log"),
    SMTP_URL: z.string().optional(),
    EMAIL_FROM: z.string().min(3).default("Eventify <no-reply@eventify.local>"),
    OUTBOX_POLL_MS: z.coerce.number().int().min(500).max(60_000).default(2000),
  })
  .refine(({ EMAIL_MODE, SMTP_URL }) => EMAIL_MODE !== "smtp" || Boolean(SMTP_URL), {
    message: "SMTP_URL is required when EMAIL_MODE=smtp",
    path: ["SMTP_URL"],
  });

export const config = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  CACHE_LIST_TTL_SECONDS: process.env.CACHE_LIST_TTL_SECONDS,
  CACHE_DETAIL_TTL_SECONDS: process.env.CACHE_DETAIL_TTL_SECONDS,
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_SECONDS: process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
  LOGIN_MAX_FAILURES: process.env.LOGIN_MAX_FAILURES,
  LOGIN_FAILURE_WINDOW_SECONDS: process.env.LOGIN_FAILURE_WINDOW_SECONDS,
  LOGIN_LOCK_SECONDS: process.env.LOGIN_LOCK_SECONDS,
  EMAIL_MODE: process.env.EMAIL_MODE,
  SMTP_URL: process.env.SMTP_URL,
  EMAIL_FROM: process.env.EMAIL_FROM,
  OUTBOX_POLL_MS: process.env.OUTBOX_POLL_MS,
});
