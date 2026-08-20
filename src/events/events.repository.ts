import { prisma } from "../db/prisma.js";
import type { ListEventsQuery } from "./events.schemas.js";

export type EventCreateInput = {
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
};

const confirmedBookingCount = {
  select: {
    bookings: {
      where: { status: "CONFIRMED" as const },
    },
  },
};

export const eventsRepository = {
  create(input: EventCreateInput, organizerId: string) {
    return prisma.event.create({
      data: {
        ...input,
        startsAt: new Date(input.startsAt),
        organizerId,
      },
    });
  },

  async list(query: ListEventsQuery) {
    const where = {
      ...(query.venue !== undefined ? { venue: query.venue } : {}),
      ...(query.from !== undefined || query.to !== undefined
        ? {
            startsAt: {
              ...(query.from !== undefined ? { gte: new Date(query.from) } : {}),
              ...(query.to !== undefined ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { startsAt: "asc" },
        include: { _count: confirmedBookingCount },
      }),
      prisma.event.count({ where }),
    ]);
    return { data, total };
  },

  findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: { _count: confirmedBookingCount },
    });
  },

  findByOrganizer(organizerId: string) {
    return prisma.event.findMany({
      where: { organizerId },
      orderBy: { startsAt: "desc" },
      include: { _count: confirmedBookingCount },
    });
  },

  bookingStats(eventId: string) {
    return prisma.booking.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    });
  },

  update(id: string, patch: Partial<EventCreateInput>) {
    return prisma.event.update({
      where: { id },
      data: {
        ...patch,
        ...(patch.startsAt !== undefined ? { startsAt: new Date(patch.startsAt) } : {}),
      },
    });
  },

  delete(id: string) {
    return prisma.event.delete({ where: { id } });
  },
};
