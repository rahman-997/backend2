import "dotenv/config";
import { z } from "zod";

const envSchema = z.strictObject({
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  WEB_ORIGIN: z.url(),
});

export const config = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
});
