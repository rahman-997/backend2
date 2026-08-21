import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";
import { normalizePostgresConnectionString } from "./connection-url.js";

const adapter = new PrismaPg({
  connectionString: normalizePostgresConnectionString(config.DATABASE_URL),
});

export const prisma = new PrismaClient({
  adapter,
  log: config.NODE_ENV === "production" ? ["warn", "error"] : ["query", "warn", "error"],
});
