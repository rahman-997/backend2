import { prisma } from "../db/prisma.js";

export const bookingsRepository = {
  findById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  },

  cancel(id: string) {
    return prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  },

  findByUser(userId: string) {
    return prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  },

  findByUserWithEvent(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            startsAt: true,
            priceCents: true,
            capacity: true,
            organizerId: true,
          },
        },
      },
      orderBy: [{ event: { startsAt: "asc" } }, { createdAt: "desc" }],
    });
  },
};
