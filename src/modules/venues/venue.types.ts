export interface Venue {
  id: string;
  name: string;
  address: string;
  capacity: number;
  contactEmail: string;
  createdAt: string;
}

export type CreateVenueInput = Omit<Venue, "id" | "createdAt">;
export type UpdateVenueInput = Partial<CreateVenueInput>;
