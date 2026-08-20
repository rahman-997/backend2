export type BookingStatus = "CONFIRMED" | "CANCELLED" | "WAITLISTED";

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  status: BookingStatus;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
  organizerId: string;
  createdAt: string;
}
