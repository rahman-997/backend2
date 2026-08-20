import { z } from "zod";
import type { AuthUser } from "../auth/tokens.js";
import { eventCache } from "../cache/event-cache.js";
import { prisma } from "../db/prisma.js";
import { withSerializationRetry } from "../db/serialization.js";
import { HttpError } from "../errors/http-error.js";
import { bookingsRepository } from "./bookings.repository.js";

function prismaCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : undefined;
}

async function createConfirmationOutbox(tx: typeof prisma, bookingId: string): Promise<void> {
  await tx.notificationOutbox.create({
    data: {
      type: "BOOKING_CONFIRMATION",
      payload: { bookingId },
    },
  });
}

export async function createBooking(actor: AuthUser, eventId: string) {
  try {
    const booking = await withSerializationRetry(() =>
      prisma.$transaction(
        async (transactionClient) => {
          const tx = transactionClient as unknown as typeof prisma;
          const event = await tx.event.findUnique({ where: { id: eventId } });
          if (!event) throw new HttpError(404, "Event not found");
          if (event.startsAt <= new Date()) throw new HttpError(409, "Event has already started");

          const existing = await tx.booking.findUnique({
            where: { userId_eventId: { userId: actor.sub, eventId } },
          });
          if (existing?.status === "CONFIRMED") throw new HttpError(409, "You already booked this event");

          const confirmed = await tx.booking.count({ where: { eventId, status: "CONFIRMED" } });
          const nextStatus = confirmed < event.capacity ? "CONFIRMED" : "WAITLISTED";

          let next;
          if (existing) {
            if (existing.status === nextStatus) return existing;
            next = await tx.booking.update({ where: { id: existing.id }, data: { status: nextStatus } });
          } else {
            next = await tx.booking.create({ data: { userId: actor.sub, eventId, status: nextStatus } });
          }

          if (next.status === "CONFIRMED") await createConfirmationOutbox(tx, next.id);
          return next;
        },
        { isolationLevel: "Serializable" },
      ),
    );
    await eventCache.invalidateEvent(eventId);
    return booking;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (prismaCode(error) === "P2002") throw new HttpError(409, "Booking already exists for this user and event");
    throw error;
  }
}

export function listMyBookings(actor: AuthUser) {
  return bookingsRepository.findByUserWithEvent(actor.sub);
}

export async function getBooking(id: string, actor: AuthUser) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Booking not found");
  const booking = await bookingsRepository.findById(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.userId !== actor.sub && actor.role !== "ADMIN") throw new HttpError(403, "Forbidden");
  return booking;
}

export async function cancelBooking(id: string, actor: AuthUser) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Booking not found");

  const result = await withSerializationRetry(() =>
    prisma.$transaction(
      async (transactionClient) => {
        const tx = transactionClient as unknown as typeof prisma;
        const booking = await tx.booking.findUnique({ where: { id } });
        if (!booking) throw new HttpError(404, "Booking not found");
        if (booking.userId !== actor.sub && actor.role !== "ADMIN") throw new HttpError(403, "Forbidden");
        if (booking.status === "CANCELLED") return booking;

        const wasConfirmed = booking.status === "CONFIRMED";
        const cancelled = await tx.booking.update({ where: { id }, data: { status: "CANCELLED" } });
        if (wasConfirmed) {
          await tx.notificationOutbox.create({
            data: { type: "WAITLIST_PROMOTION", payload: { eventId: booking.eventId } },
          });
        }
        return cancelled;
      },
      { isolationLevel: "Serializable" },
    ),
  );

  await eventCache.invalidateEvent(result.eventId);
  return result;
}
