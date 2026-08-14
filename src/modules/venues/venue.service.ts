import { HttpError } from "../../errors/HttpError.js";
import { venueRepository } from "./venue.repository.factory.js";
import type { CreateVenueInput, UpdateVenueInput } from "./venue.types.js";
import type { VenueListQuery } from "./venue.repository.js";
export const venueService = {
  async create(input: CreateVenueInput) { const duplicate=await venueRepository.findByNormalizedName(input.name); if(duplicate) throw new HttpError(409,`Venue with name "${input.name}" already exists`); return venueRepository.create(input); },
  async list(query: VenueListQuery) { return venueRepository.list(query); },
  async getById(id:string) { const venue=await venueRepository.getById(id); if(!venue) throw new HttpError(404,`Venue with id "${id}" not found`); return venue; },
  async update(id:string,input:UpdateVenueInput) { await this.getById(id); if(input.name!==undefined){const duplicate=await venueRepository.findByNormalizedName(input.name,id);if(duplicate) throw new HttpError(409,`Venue with name "${input.name}" already exists`);} const venue=await venueRepository.update(id,input); if(!venue) throw new HttpError(404,`Venue with id "${id}" not found`); return venue; },
  async delete(id:string) { await this.getById(id); await venueRepository.delete(id); },
  async health() { return venueRepository.health(); }
};
