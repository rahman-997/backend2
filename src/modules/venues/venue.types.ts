export interface Venue {
  id: string;
  name: string;
  address: string;
  capacity: number;
  contactEmail: string;
  ownerUserId: string | null;
  createdAt: string;
}

export interface CreateVenueInput {
  name: string;
  address: string;
  capacity: number;
  contactEmail: string;
}

export type UpdateVenueInput = Partial<CreateVenueInput>;
