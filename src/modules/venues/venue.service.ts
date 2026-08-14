import { randomUUID } from "node:crypto";
import { HttpError } from "../../errors/HttpError.js";
import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";

const venueStore = new Map<string, Venue>();

const normalizeName = (name: string): string => name.trim().toLocaleLowerCase();

const isNameTaken = (name: string, excludeId?: string): boolean => {
  const normalizedName = normalizeName(name);
  for (const venue of venueStore.values()) {
    if (venue.id !== excludeId && normalizeName(venue.name) === normalizedName) return true;
  }
  return false;
};

export const venueService = {
  create(input: CreateVenueInput): Venue {
    if (isNameTaken(input.name)) {
      throw new HttpError(409, `Venue with name "${input.name}" already exists`);
    }
    const venue: Venue = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    venueStore.set(venue.id, venue);
    return venue;
  },

  list(limit: number): Venue[] {
    return Array.from(venueStore.values()).slice(0, limit);
  },

  getById(id: string): Venue {
    const venue = venueStore.get(id);
    if (!venue) throw new HttpError(404, `Venue with id "${id}" not found`);
    return venue;
  },

  update(id: string, input: UpdateVenueInput): Venue {
    const existing = this.getById(id);
    if (input.name !== undefined && isNameTaken(input.name, id)) {
      throw new HttpError(409, `Venue with name "${input.name}" already exists`);
    }
    const updated: Venue = { ...existing, ...input };
    venueStore.set(id, updated);
    return updated;
  },

  delete(id: string): void {
    this.getById(id);
    venueStore.delete(id);
  },
};
