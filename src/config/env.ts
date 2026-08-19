import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    CORS_ORIGIN: z.string().min(1).default("*"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    DATABASE_URL: z.string().url().optional(),
    MYSQL_URL: z.string().url().optional(),
    DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
    STORAGE: z.enum(["memory", "postgres", "mysql"]).default("memory"),
    JWT_SECRET: z.string().min(32).optional(),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(86_400).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE === "postgres" && !value.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when STORAGE=postgres",
      });
    }

    if (value.STORAGE === "mysql" && !value.MYSQL_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["MYSQL_URL"],
        message: "MYSQL_URL is required when STORAGE=mysql",
      });
    }

    if (value.NODE_ENV === "production" && !value.JWT_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET is required in production",
      });
    }
  });

export const env = envSchema.parse(process.env);
