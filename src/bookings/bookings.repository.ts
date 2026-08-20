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
};
