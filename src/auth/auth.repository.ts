import { prisma } from "../db/prisma.js";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  createUser(data: { email: string; passwordHash: string; name: string }) {
    return prisma.user.create({ data: { ...data, role: "ATTENDEE" } });
  },
  updatePasswordHash(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },
};
