import { prisma } from "./prisma.js";

export async function databaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
