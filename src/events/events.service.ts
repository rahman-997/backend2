import { z } from "zod";
import type { AuthUser } from "../auth/tokens.js";
import { eventCache } from "../cache/event-cache.js";
import { HttpError } from "../errors/http-error.js";
import { eventsRepository, type EventCreateInput } from "./events.repository.js";
import type { ListEventsQuery } from "./events.schemas.js";

function enrichAvailability<T extends { capacity: number; _count: { bookings: number } }>(event: T) {
  const { _count, ...rest } = event;
  const confirmedBookings = _count.bookings;
  const remainingSeats = Math.max(0, event.capacity - confirmedBookings);
  return { ...rest, confirmedBookings, remainingSeats, soldOut: remainingSeats === 0 };
}

function startTimestamp(startsAt: string | Date): number {
  return new Date(startsAt).getTime();
}

function assertFutureStart(startsAt: string | Date): void {
  if (startTimestamp(startsAt) <= Date.now()) {
    throw new HttpError(409, "Event start time must be in the future");
  }
}

export async function createEvent(input: EventCreateInput, actor: AuthUser) {
  assertFutureStart(input.startsAt);
  const created = await eventsRepository.create(input, actor.sub);
  await eventCache.invalidateCollection();
  return created;
}

export function listEvents(query: ListEventsQuery) {
  return eventCache.list(query, async () => {
    const { data, total } = await eventsRepository.list(query);
    return { data: data.map(enrichAvailability), page: query.page, limit: query.limit, total };
  });
}

export async function getEvent(id: string) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Event not found");
  return eventCache.detail(id, async () => {
    const event = await eventsRepository.findById(id);
    if (!event) throw new HttpError(404, "Event not found");
    return enrichAvailability(event);
  });
}

function assertEventOwner(event: { organizerId: string }, actor: AuthUser) {
  if (actor.role === "ADMIN") return;
  if (event.organizerId !== actor.sub) throw new HttpError(403, "Forbidden");
}

export async function listMyEvents(actor: AuthUser) {
  return (await eventsRepository.findByOrganizer(actor.sub)).map(enrichAvailability);
}

export async function getEventStats(id: string, actor: AuthUser) {
  const event = await getEvent(id);
  assertEventOwner(event, actor);
  const grouped = await eventsRepository.bookingStats(id);
  const counts = { CONFIRMED: 0, CANCELLED: 0, WAITLISTED: 0 };
  for (const row of grouped) counts[row.status] = row._count._all;
  return {
    eventId: event.id,
    capacity: event.capacity,
    confirmed: counts.CONFIRMED,
    cancelled: counts.CANCELLED,
    waitlisted: counts.WAITLISTED,
    remainingSeats: Math.max(0, event.capacity - counts.CONFIRMED),
    occupancyRate: event.capacity > 0 ? Number((counts.CONFIRMED / event.capacity).toFixed(4)) : 0,
    grossRevenueCents: counts.CONFIRMED * event.priceCents,
  };
}

export async function updateEvent(id: string, patch: Partial<EventCreateInput>, actor: AuthUser) {
  const event = await getEvent(id);
  assertEventOwner(event, actor);

  if (startTimestamp(event.startsAt) <= Date.now()) throw new HttpError(409, "Started events can no longer be edited");
  if (patch.startsAt !== undefined) assertFutureStart(patch.startsAt);
  if (patch.capacity !== undefined && patch.capacity < event.confirmedBookings) {
    throw new HttpError(409, `Capacity cannot be lower than ${event.confirmedBookings} confirmed bookings`);
  }

  const updated = await eventsRepository.update(id, patch);
  await eventCache.invalidateEvent(id);
  return updated;
}

export async function deleteEvent(id: string, actor: AuthUser) {
  const event = await getEvent(id);
  assertEventOwner(event, actor);

  const grouped = await eventsRepository.bookingStats(id);
  const activeBookings = grouped
    .filter((row) => row.status === "CONFIRMED" || row.status === "WAITLISTED")
    .reduce((total, row) => total + row._count._all, 0);
  if (activeBookings > 0) {
    throw new HttpError(409, "Events with confirmed or waitlisted bookings cannot be deleted");
  }

  await eventsRepository.delete(id);
  await eventCache.invalidateEvent(id);
  return event;
}
