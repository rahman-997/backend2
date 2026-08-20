import { randomUUID } from "node:crypto";
import type { Booking } from "../domain.js";
import { HttpError } from "../errors/http-error.js";
import { getEvent } from "../events/events.service.js";

const bookings = new Map<string, Booking>();

export function createBooking(userId: string, eventId: string): Booking {
  const event = getEvent(eventId);
  const duplicate = [...bookings.values()].some(
    (booking) => booking.userId === userId && booking.eventId === eventId,
  );
  if (duplicate) throw new HttpError(409, "Booking already exists for this user and event");

  const confirmed = [...bookings.values()].filter(
    (booking) => booking.eventId === eventId && booking.status === "CONFIRMED",
  ).length;
  if (confirmed >= event.capacity) throw new HttpError(409, "Event is at capacity");

  const booking: Booking = {
    id: randomUUID(),
    userId,
    eventId,
    status: "CONFIRMED",
    createdAt: new Date().toISOString(),
  };
  bookings.set(booking.id, booking);
  return booking;
}

export function getBooking(id: string): Booking {
  const booking = bookings.get(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  return booking;
}

export function cancelBooking(id: string): Booking {
  const booking = getBooking(id);
  const cancelled = { ...booking, status: "CANCELLED" as const };
  bookings.set(id, cancelled);
  return cancelled;
}
