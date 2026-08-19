import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";

export type VenueSortBy = "createdAt" | "name" | "address" | "capacity";
export type SortOrder = "asc" | "desc";

export interface VenueListQuery {
  page: number;
  limit: number;
  search?: string;
  minCapacity?: number;
  maxCapacity?: number;
  sortBy: VenueSortBy;
  order: SortOrder;
}

export interface VenueListResult {
  data: Venue[];
  total: number;
}

export interface VenueRepository {
  create(input: CreateVenueInput, ownerUserId: string): Promise<Venue>;
  list(query: VenueListQuery): Promise<VenueListResult>;
  getById(id: string): Promise<Venue | null>;
  findByNormalizedName(name: string, excludeId?: string): Promise<Venue | null>;
  update(id: string, input: UpdateVenueInput): Promise<Venue | null>;
  delete(id: string): Promise<boolean>;
  health(): Promise<boolean>;
}
