import { randomUUID } from "node:crypto";
import type { CreateVenueInput, UpdateVenueInput, Venue } from "./venue.types.js";
import type { VenueListQuery, VenueListResult, VenueRepository } from "./venue.repository.js";

const normalizeName = (name: string): string => name.trim().toLocaleLowerCase();

export class MemoryVenueRepository implements VenueRepository {
  private readonly store = new Map<string, Venue>();

  async create(input: CreateVenueInput): Promise<Venue> {
    const venue: Venue = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    this.store.set(venue.id, venue);
    return venue;
  }

  async list(query: VenueListQuery): Promise<VenueListResult> {
    let items = Array.from(this.store.values());
    const search = query.search?.toLocaleLowerCase();
    if (search) items = items.filter((v) => `${v.name} ${v.address}`.toLocaleLowerCase().includes(search));
    if (query.minCapacity !== undefined) items = items.filter((v) => v.capacity >= query.minCapacity!);
    if (query.maxCapacity !== undefined) items = items.filter((v) => v.capacity <= query.maxCapacity!);
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = items.length;
    const start = (query.page - 1) * query.limit;
    return { data: items.slice(start, start + query.limit), total };
  }

  async getById(id: string): Promise<Venue | null> { return this.store.get(id) ?? null; }

  async findByNormalizedName(name: string, excludeId?: string): Promise<Venue | null> {
    const normalized = normalizeName(name);
    return Array.from(this.store.values()).find((v) => v.id !== excludeId && normalizeName(v.name) === normalized) ?? null;
  }

  async update(id: string, input: UpdateVenueInput): Promise<Venue | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...input };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> { return this.store.delete(id); }
  async health(): Promise<boolean> { return true; }
}
