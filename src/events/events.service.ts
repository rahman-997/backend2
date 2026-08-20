import { z } from "zod";
import { HttpError } from "../errors/http-error.js";
import type { AuthUser } from "../auth/tokens.js";
import type { ListEventsQuery } from "./events.schemas.js";
import { eventsRepository, type EventCreateInput } from "./events.repository.js";

export function createEvent(input: EventCreateInput, actor: AuthUser) {
  return eventsRepository.create(input, actor.sub);
}

export async function listEvents(query: ListEventsQuery) {
  const { data, total } = await eventsRepository.list(query);
  return { data, page: query.page, limit: query.limit, total };
}

export async function getEvent(id: string) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Event not found");
  const event = await eventsRepository.findById(id);
  if (!event) throw new HttpError(404, "Event not found");
  return event;
}

function assertEventOwner(event: { organizerId: string }, actor: AuthUser) {
  if (actor.role === "ADMIN") return;
  if (event.organizerId !== actor.sub) throw new HttpError(403, "Forbidden");
}

export async function updateEvent(id: string, patch: Partial<EventCreateInput>, actor: AuthUser) {
  const event = await getEvent(id);
  assertEventOwner(event, actor);
  return eventsRepository.update(id, patch);
}

export async function deleteEvent(id: string, actor: AuthUser) {
  const event = await getEvent(id);
  assertEventOwner(event, actor);
  await eventsRepository.delete(id);
  return event;
}
