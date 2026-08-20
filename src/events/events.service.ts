import { z } from "zod";
import { HttpError } from "../errors/http-error.js";
import type { ListEventsQuery } from "./events.schemas.js";
import { eventsRepository, type EventCreateInput } from "./events.repository.js";

export function createEvent(input: EventCreateInput, organizerId: string) {
  return eventsRepository.create(input, organizerId);
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

export async function updateEvent(id: string, patch: Partial<EventCreateInput>) {
  await getEvent(id);
  return eventsRepository.update(id, patch);
}

export async function deleteEvent(id: string) {
  const event = await getEvent(id);
  await eventsRepository.delete(id);
  return event;
}
