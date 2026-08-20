import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error.js";
import { verifyAccessToken, type AuthUser } from "./tokens.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Authentication required");

  try {
    const user = await verifyAccessToken(header.slice(7));
    res.locals.user = user;
    next();
  } catch {
    throw new HttpError(401, "Authentication required");
  }
};

export function requireRole(...roles: AuthUser["role"][]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user as AuthUser | undefined;
    if (!user) throw new HttpError(401, "Authentication required");
    if (!roles.includes(user.role)) throw new HttpError(403, "Forbidden");
    next();
  };
}
