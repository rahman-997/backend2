import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../errors/HttpError.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimit: RequestHandler = (req, _res, next) => {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + env.RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (current.count >= env.RATE_LIMIT_MAX) {
    throw new HttpError(429, "Too many requests. Please try again later.");
  }

  current.count += 1;
  next();
};
