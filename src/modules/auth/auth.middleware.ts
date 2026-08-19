import type { RequestHandler } from "express";
import { HttpError } from "../../errors/HttpError.js";
import { verifyAccessToken } from "./auth.crypto.js";
import { authRepository } from "./auth.repository.js";
import type { AuthPrincipal, UserRole } from "./auth.types.js";

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Authentication required");

    const token = header.slice("Bearer ".length).trim();
    if (!token) throw new HttpError(401, "Authentication required");

    const decoded = await verifyAccessToken(token);
    const user = await authRepository.findUserById(decoded.userId);
    if (!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion) {
      throw new HttpError(401, "Invalid or expired access token");
    }

    res.locals.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    } satisfies AuthPrincipal;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired access token"));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (_req, res, next) => {
    const principal = res.locals.auth as AuthPrincipal | undefined;
    if (!principal) return next(new HttpError(401, "Authentication required"));
    if (!roles.includes(principal.role)) return next(new HttpError(403, "Insufficient permissions"));
    next();
  };
}
