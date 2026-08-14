import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";

export interface VenueListQuery {
  page: number;
  limit: number;
  search?: string;
  minCapacity?: number;
  maxCapacity?: number;
}

export interface VenueListResult {
  data: Venue[];
  total: number;
}

export interface VenueRepository {
  create(input: CreateVenueInput): Promise<Venue>;
  list(query: VenueListQuery): Promise<VenueListResult>;
  getById(id: string): Promise<Venue | null>;
  findByNormalizedName(name: string, excludeId?: string): Promise<Venue | null>;
  update(id: string, input: UpdateVenueInput): Promise<Venue | null>;
  delete(id: string): Promise<boolean>;
  health(): Promise<boolean>;
}
