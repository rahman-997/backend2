import { prisma } from "../db/prisma.js";

export type SignupRole = "ATTENDEE" | "ORGANIZER";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  createUser(data: { email: string; passwordHash: string; name: string; role: SignupRole }) {
    return prisma.user.create({ data });
  },
};
