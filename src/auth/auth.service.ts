import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createRefreshToken, hashRefreshToken, signAccessToken } from "./tokens.js";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN";
  createdAt: Date;
};

function toPublicUser(user: { id: string; email: string; name: string; role: PublicUser["role"]; createdAt: Date }): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

async function issuePair(user: { id: string; role: PublicUser["role"] }) {
  const accessToken = await signAccessToken({ sub: user.id, role: user.role });
  const refresh = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: refresh.hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return { accessToken, refreshToken: refresh.raw };
}

export async function signup(input: { email: string; password: string; name: string }) {
  try {
    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({ email: input.email.toLowerCase(), passwordHash, name: input.name });
    const pair = await issuePair(user);
    return { user: toPublicUser(user), ...pair };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Account already exists");
    }
    throw error;
  }
}

export async function login(input: { email: string; password: string }) {
  const user = await authRepository.findUserByEmail(input.email.toLowerCase());
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !valid) throw new HttpError(401, "Invalid email or password");

  const pair = await issuePair(user);
  return { user: toPublicUser(user), ...pair };
}

export async function refresh(rawToken: string | undefined) {
  if (!rawToken) throw new HttpError(401, "Invalid refresh token");
  const oldHash = hashRefreshToken(rawToken);
  const next = createRefreshToken();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const current = await tx.refreshToken.findUnique({
          where: { tokenHash: oldHash },
          include: { user: true },
        });
        if (!current || current.revokedAt || current.expiresAt <= new Date()) {
          throw new HttpError(401, "Invalid refresh token");
        }

        const replacement = await tx.refreshToken.create({
          data: {
            tokenHash: next.hash,
            userId: current.userId,
            expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
          },
        });

        await tx.refreshToken.update({
          where: { id: current.id },
          data: { revokedAt: new Date(), replacedById: replacement.id },
        });

        return { user: current.user };
      },
      { isolationLevel: "Serializable" },
    );

    return {
      accessToken: await signAccessToken({ sub: result.user.id, role: result.user.role }),
      refreshToken: next.raw,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw error;
  }
}
