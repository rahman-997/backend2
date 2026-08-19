import { env } from "../../config/env.js";
import { HttpError } from "../../errors/HttpError.js";
import { auditService } from "../audit/audit.service.js";
import { createRefreshToken, hashPassword, hashRefreshToken, signAccessToken, verifyPassword } from "./auth.crypto.js";
import { authRepository } from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import type { AuthTokens, User, UserRecord, UserRole } from "./auth.types.js";

function safeUser(user: UserRecord): User {
  const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...safe } = user;
  return safe;
}

function registrationRole(email: string): UserRole {
  const bootstrap = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  return bootstrap && bootstrap === email.toLowerCase() ? "ADMIN" : "USER";
}

async function issueTokens(user: UserRecord): Promise<AuthTokens> {
  if (!user.isActive) throw new HttpError(403, "Account is disabled");
  await authRepository.purgeExpiredRefreshTokens();

  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000).toISOString();
  await authRepository.storeRefreshToken({ userId: user.id, tokenHash, expiresAt });

  return {
    accessToken: await signAccessToken(user),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: User; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();
    if (await authRepository.findUserByEmail(email)) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const user = await authRepository.createUser({
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: registrationRole(email),
    });

    await auditService.record({ actorUserId: user.id, action: "auth.register", resourceType: "user", resourceId: user.id });
    return { user: safeUser(user), tokens: await issueTokens(user) };
  },

  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await authRepository.findUserByEmail(input.email.trim().toLowerCase());
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    if (!user.isActive) throw new HttpError(403, "Account is disabled");

    await auditService.record({ actorUserId: user.id, action: "auth.login", resourceType: "user", resourceId: user.id });
    return { user: safeUser(user), tokens: await issueTokens(user) };
  },

  async refresh(refreshToken: string): Promise<{ user: User; tokens: AuthTokens }> {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await authRepository.findRefreshTokenByHash(tokenHash);
    if (!stored || stored.revokedAt || new Date(stored.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(401, "Invalid or expired refresh token");
    }

    const user = await authRepository.findUserById(stored.userId);
    if (!user || !user.isActive) throw new HttpError(401, "Invalid refresh token");

    await authRepository.revokeRefreshToken(tokenHash);
    return { user: safeUser(user), tokens: await issueTokens(user) };
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await authRepository.findRefreshTokenByHash(tokenHash);
    await authRepository.revokeRefreshToken(tokenHash);
    if (stored) {
      await auditService.record({ actorUserId: stored.userId, action: "auth.logout", resourceType: "user", resourceId: stored.userId });
    }
  },

  async logoutAll(userId: string): Promise<void> {
    const user = await authRepository.incrementTokenVersion(userId);
    if (!user) throw new HttpError(404, "User not found");
    await authRepository.revokeAllRefreshTokens(userId);
    await auditService.record({ actorUserId: userId, action: "auth.logout_all", resourceType: "user", resourceId: userId });
  },

  async me(userId: string): Promise<User> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new HttpError(404, "User not found");
    return safeUser(user);
  },

  async listUsers(): Promise<User[]> {
    return authRepository.listUsers();
  },

  async updateUserRole(actorUserId: string, targetUserId: string, role: UserRole): Promise<User> {
    if (actorUserId === targetUserId) throw new HttpError(400, "Administrators cannot change their own role");
    const existing = await authRepository.findUserById(targetUserId);
    if (!existing) throw new HttpError(404, "User not found");

    const updated = await authRepository.updateUserRole(targetUserId, role);
    if (!updated) throw new HttpError(404, "User not found");
    await authRepository.revokeAllRefreshTokens(targetUserId);
    await auditService.record({
      actorUserId,
      action: "admin.user_role_updated",
      resourceType: "user",
      resourceId: targetUserId,
      metadata: { from: existing.role, to: role },
    });
    return safeUser(updated);
  },

  async updateUserStatus(actorUserId: string, targetUserId: string, isActive: boolean): Promise<User> {
    if (actorUserId === targetUserId && !isActive) throw new HttpError(400, "Administrators cannot disable their own account");
    const existing = await authRepository.findUserById(targetUserId);
    if (!existing) throw new HttpError(404, "User not found");

    const updated = await authRepository.setUserActive(targetUserId, isActive);
    if (!updated) throw new HttpError(404, "User not found");
    await authRepository.revokeAllRefreshTokens(targetUserId);
    await auditService.record({
      actorUserId,
      action: isActive ? "admin.user_enabled" : "admin.user_disabled",
      resourceType: "user",
      resourceId: targetUserId,
      metadata: { previous: existing.isActive, current: isActive },
    });
    return safeUser(updated);
  },
};
