import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { bookingsRepository } from "./bookings.repository.js";

export async function createBooking(userId: string, eventId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new HttpError(404, "Event not found");

        const confirmed = await tx.booking.count({
          where: { eventId, status: "CONFIRMED" },
        });
        if (confirmed >= event.capacity) throw new HttpError(409, "Event is at capacity");

        const existing = await tx.booking.findUnique({
          where: { userId_eventId: { userId, eventId } },
        });

        if (existing?.status === "CANCELLED") {
          return tx.booking.update({
            where: { id: existing.id },
            data: { status: "CONFIRMED" },
          });
        }

        if (existing?.status === "WAITLISTED") return existing;

        return tx.booking.create({
          data: { userId, eventId, status: "CONFIRMED" },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Booking already exists for this user and event");
    }
    throw error;
  }
}

export async function getBooking(id: string) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Booking not found");
  const booking = await bookingsRepository.findById(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  return booking;
}

export async function cancelBooking(id: string) {
  await getBooking(id);
  return bookingsRepository.cancel(id);
}
