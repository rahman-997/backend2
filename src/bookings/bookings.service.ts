import { z } from "zod";
import type { AuthUser } from "../auth/tokens.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { bookingsRepository } from "./bookings.repository.js";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function createBooking(actor: AuthUser, eventId: string) {
  try {
    return await prisma.$transaction(
      async (transactionClient) => {
        const tx = transactionClient as unknown as typeof prisma;
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new HttpError(404, "Event not found");

        const confirmed = await tx.booking.count({ where: { eventId, status: "CONFIRMED" } });
        if (confirmed >= event.capacity) throw new HttpError(409, "Event is at capacity");

        const existing = await tx.booking.findUnique({
          where: { userId_eventId: { userId: actor.sub, eventId } },
        });

        if (existing?.status === "CANCELLED") {
          return tx.booking.update({ where: { id: existing.id }, data: { status: "CONFIRMED" } });
        }
        if (existing?.status === "WAITLISTED") return existing;

        return tx.booking.create({ data: { userId: actor.sub, eventId, status: "CONFIRMED" } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (isUniqueViolation(error)) throw new HttpError(409, "Booking already exists for this user and event");
    throw error;
  }
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
  const booking = await bookingsRepository.findById(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.userId !== actor.sub) throw new HttpError(403, "Forbidden");
  return bookingsRepository.cancel(id);
}
