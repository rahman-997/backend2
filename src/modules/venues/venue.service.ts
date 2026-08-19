import { HttpError } from "../../errors/HttpError.js";
import { auditService } from "../audit/audit.service.js";
import type { AuthPrincipal } from "../auth/auth.types.js";
import { venueRepository } from "./venue.repository.factory.js";
import type { VenueListQuery } from "./venue.repository.js";
import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";

function authorizeMutation(venue: Venue, actor: AuthPrincipal): void {
  if (actor.role === "ADMIN") return;
  if (!venue.ownerUserId || venue.ownerUserId !== actor.userId) {
    throw new HttpError(403, "You do not have permission to modify this venue");
  }
}

export const venueService = {
  async create(input: CreateVenueInput, actor: AuthPrincipal) {
    const duplicate = await venueRepository.findByNormalizedName(input.name);
    if (duplicate) {
      throw new HttpError(409, `Venue with name "${input.name}" already exists`);
    }

    const venue = await venueRepository.create(input, actor.userId);
    await auditService.record({
      actorUserId: actor.userId,
      action: "venue.created",
      resourceType: "venue",
      resourceId: venue.id,
      metadata: { name: venue.name },
    });
    return venue;
  },

  async list(query: VenueListQuery) {
    return venueRepository.list(query);
  },

  async getById(id: string) {
    const venue = await venueRepository.getById(id);
    if (!venue) {
      throw new HttpError(404, `Venue with id "${id}" not found`);
    }
    return venue;
  },

  async update(id: string, input: UpdateVenueInput, actor: AuthPrincipal) {
    const existing = await this.getById(id);
    authorizeMutation(existing, actor);

    if (input.name !== undefined) {
      const duplicate = await venueRepository.findByNormalizedName(input.name, id);
      if (duplicate) {
        throw new HttpError(409, `Venue with name "${input.name}" already exists`);
      }
    }

    const venue = await venueRepository.update(id, input);
    if (!venue) throw new HttpError(404, `Venue with id "${id}" not found`);

    await auditService.record({
      actorUserId: actor.userId,
      action: "venue.updated",
      resourceType: "venue",
      resourceId: id,
      metadata: { fields: Object.keys(input) },
    });
    return venue;
  },

  async delete(id: string, actor: AuthPrincipal) {
    const venue = await this.getById(id);
    authorizeMutation(venue, actor);
    await venueRepository.delete(id);
    await auditService.record({
      actorUserId: actor.userId,
      action: "venue.deleted",
      resourceType: "venue",
      resourceId: id,
      metadata: { name: venue.name },
    });
  },

  async health() {
    return venueRepository.health();
  },
};
