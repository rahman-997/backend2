import http from "node:http";
import { Queue, Worker, type Job } from "bullmq";
import { z } from "zod";
import { eventCache } from "../cache/event-cache.js";
import { config } from "../config.js";
import { prisma } from "../db/prisma.js";
import { closeRedis, createQueueRedis, createWorkerRedis } from "../redis/client.js";
import { sendBookingConfirmation } from "./email.js";
import { dispatchOutbox, markOutboxFailed, markOutboxSent } from "./outbox.js";

const QUEUE_NAME = "eventify-background";
const producerConnection = createQueueRedis();
const workerConnection = createWorkerRedis();
const queue = new Queue(QUEUE_NAME, { connection: producerConnection });

const bookingConfirmationSchema = z.strictObject({ bookingId: z.uuid() });
const waitlistPromotionSchema = z.strictObject({ eventId: z.uuid() });

function prismaCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : undefined;
}

async function serializable<T>(work: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      last = error;
      if (prismaCode(error) !== "P2034" || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }
  throw last;
}

async function confirmBooking(job: Job): Promise<void> {
  const { bookingId } = bookingConfirmationSchema.parse(job.data);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, event: true },
  });
  if (!booking || booking.status !== "CONFIRMED") return;
  await sendBookingConfirmation({
    bookingId: booking.id,
    email: booking.user.email,
    name: booking.user.name,
    title: booking.event.title,
    venue: booking.event.venue,
    startsAt: booking.event.startsAt,
  });
}

async function promoteWaitlist(job: Job): Promise<void> {
  const { eventId } = waitlistPromotionSchema.parse(job.data);
  const promoted = await serializable(() =>
    prisma.$transaction(
      async (transactionClient) => {
        const tx = transactionClient as unknown as typeof prisma;
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) return 0;
        const confirmed = await tx.booking.count({ where: { eventId, status: "CONFIRMED" } });
        const openSeats = Math.max(0, event.capacity - confirmed);
        if (openSeats === 0) return 0;

        const waiting = await tx.booking.findMany({
          where: { eventId, status: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
          take: openSeats,
        });
        for (const booking of waiting) {
          const next = await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
          await tx.notificationOutbox.create({
            data: { type: "BOOKING_CONFIRMATION", payload: { bookingId: next.id } },
          });
        }
        return waiting.length;
      },
      { isolationLevel: "Serializable" },
    ),
  );
  if (promoted > 0) await eventCache.invalidateEvent(eventId);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name === "BOOKING_CONFIRMATION") return confirmBooking(job);
    if (job.name === "WAITLIST_PROMOTION") return promoteWaitlist(job);
    throw new Error(`Unknown Eventify job type: ${job.name}`);
  },
  { connection: workerConnection, concurrency: 5 },
);

worker.on("completed", (job) => {
  if (job.id) void markOutboxSent(job.id).catch((error) => console.error("[outbox] mark sent failed", error));
});
worker.on("failed", (job, error) => {
  console.error("[worker] job failed", { jobId: job?.id ?? "unknown", message: error.message });
  const attempts = job?.opts.attempts ?? 1;
  if (job?.id && job.attemptsMade >= attempts) {
    void markOutboxFailed(job.id, error).catch((markError) => console.error("[outbox] mark failed failed", markError));
  }
});
worker.on("error", (error) => console.error("[worker]", error));

let dispatching = false;
async function tick() {
  if (dispatching) return;
  dispatching = true;
  try {
    await dispatchOutbox(queue);
  } catch (error) {
    console.error("[outbox] dispatch failed", error instanceof Error ? error.message : String(error));
  } finally {
    dispatching = false;
  }
}

await tick();
const pollTimer = setInterval(() => void tick(), config.OUTBOX_POLL_MS);
pollTimer.unref();

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "ok", worker: "eventify-background" }));
});
healthServer.listen(port, host, () => console.log(`Eventify worker health on http://${host}:${port}`));

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[worker] shutting down: ${signal}`);
  clearInterval(pollTimer);
  healthServer.close();
  await worker.close();
  await queue.close();
  await Promise.allSettled([producerConnection.quit(), workerConnection.quit(), closeRedis(), prisma.$disconnect()]);
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
