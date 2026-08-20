import { randomUUID } from "node:crypto";
import type { Event } from "../domain.js";
import { HttpError } from "../errors/http-error.js";
import type { ListEventsQuery } from "./events.schemas.js";

const events = new Map<string, Event>();

export function createEvent(
  input: Omit<Event, "id" | "createdAt" | "organizerId">,
  organizerId: string,
): Event {
  const event: Event = {
    id: randomUUID(),
    ...input,
    organizerId,
    createdAt: new Date().toISOString(),
  };
  events.set(event.id, event);
  return event;
}

export function listEvents(query: ListEventsQuery) {
  let filtered = [...events.values()];
  if (query.venue !== undefined) filtered = filtered.filter((event) => event.venue === query.venue);
  if (query.from !== undefined) filtered = filtered.filter((event) => new Date(event.startsAt) >= new Date(query.from!));
  if (query.to !== undefined) filtered = filtered.filter((event) => new Date(event.startsAt) <= new Date(query.to!));

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  return { data: filtered.slice(start, start + query.limit), page: query.page, limit: query.limit, total };
}

export function getEvent(id: string): Event {
  const event = events.get(id);
  if (!event) throw new HttpError(404, "Event not found");
  return event;
}

export function updateEvent(id: string, patch: Partial<Omit<Event, "id" | "createdAt" | "organizerId">>): Event {
  const current = getEvent(id);
  const next = { ...current, ...patch };
  events.set(id, next);
  return next;
}

export function deleteEvent(id: string): Event {
  const event = getEvent(id);
  events.delete(id);
  return event;
}

export function countConfirmedBookingsForEvent(eventId: string, bookings: Iterable<{ eventId: string; status: string }>): number {
  let count = 0;
  for (const booking of bookings) {
    if (booking.eventId === eventId && booking.status === "CONFIRMED") count += 1;
  }
  return count;
}
