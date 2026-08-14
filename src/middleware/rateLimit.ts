import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../errors/HttpError.js";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Prevent expired client buckets from growing forever in long-lived processes.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, Math.max(env.RATE_LIMIT_WINDOW_MS, 60_000));
cleanupInterval.unref();

export const rateLimit: RequestHandler = (req, res, next) => {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + env.RATE_LIMIT_WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    res.setHeader("X-RateLimit-Limit", env.RATE_LIMIT_MAX);
    res.setHeader("X-RateLimit-Remaining", Math.max(env.RATE_LIMIT_MAX - 1, 0));
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));
    next();
    return;
  }

  if (current.count >= env.RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", retryAfterSeconds);
    res.setHeader("X-RateLimit-Limit", env.RATE_LIMIT_MAX);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("X-RateLimit-Reset", Math.ceil(current.resetAt / 1000));
    throw new HttpError(429, "Too many requests. Please try again later.", {
      retryAfterSeconds,
    });
  }

  current.count += 1;
  res.setHeader("X-RateLimit-Limit", env.RATE_LIMIT_MAX);
  res.setHeader("X-RateLimit-Remaining", Math.max(env.RATE_LIMIT_MAX - current.count, 0));
  res.setHeader("X-RateLimit-Reset", Math.ceil(current.resetAt / 1000));
  next();
};
