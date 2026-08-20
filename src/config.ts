import "dotenv/config";
import { z } from "zod";

const envSchema = z.strictObject({
  DATABASE_URL: z.url(),
});

export const config = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
