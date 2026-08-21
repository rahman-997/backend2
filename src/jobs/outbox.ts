import type { Queue } from "bullmq";
import { config } from "../config.js";
import { prisma } from "../db/prisma.js";

const STALE_ENQUEUED_MS = 2 * 60 * 1000;

export async function dispatchOutbox(queue: Queue): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(Date.now() - STALE_ENQUEUED_MS);
  const rows = await prisma.notificationOutbox.findMany({
    where: {
      availableAt: { lte: now },
      OR: [
        { status: "PENDING" },
        { status: "ENQUEUED", enqueuedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let dispatched = 0;
  for (const row of rows) {
    try {
      await queue.add(row.type, row.payload as Record<string, unknown>, {
        jobId: row.id,
        attempts: 5,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
      });
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { status: "ENQUEUED", enqueuedAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      dispatched += 1;
    } catch (error) {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000) },
      });
    }
  }
  return dispatched;
}

export async function markOutboxSent(id: string): Promise<void> {
  await prisma.notificationOutbox.updateMany({
    where: { id, status: { not: "SENT" } },
    data: { status: "SENT", sentAt: new Date(), lastError: null },
  });
}

export async function markOutboxFailed(id: string, error: Error): Promise<void> {
  await prisma.notificationOutbox.updateMany({
    where: { id, status: { not: "SENT" } },
    data: { status: "FAILED", lastError: error.message.slice(0, 2000) },
  });
}

export async function purgeDeliveredOutbox(): Promise<number> {
  const cutoff = new Date(Date.now() - config.OUTBOX_RETENTION_DAYS * 86_400_000);
  const result = await prisma.notificationOutbox.deleteMany({
    where: {
      status: "SENT",
      sentAt: { lt: cutoff },
    },
  });
  return result.count;
}
