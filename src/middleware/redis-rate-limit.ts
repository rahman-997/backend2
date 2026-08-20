import type { RequestHandler } from "express";
import { redis } from "../redis/client.js";

const WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`;

type RateLimitOptions = {
  prefix: string;
  limit: number;
  windowSeconds: number;
};

function parsePair(value: unknown): [number, number] {
  if (!Array.isArray(value)) return [0, 0];
  return [Number(value[0] ?? 0), Number(value[1] ?? 0)];
}

export function redisRateLimit({ prefix, limit, windowSeconds }: RateLimitOptions): RequestHandler {
  return async (req, res, next) => {
    const identity = req.ip || req.socket.remoteAddress || "unknown";
    const key = `eventify:ratelimit:${prefix}:${identity}`;
    try {
      const [count, ttl] = parsePair(await redis.eval(WINDOW_SCRIPT, 1, key, String(windowSeconds)));
      const reset = Math.max(1, ttl);
      res.setHeader("RateLimit-Limit", String(limit));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - count)));
      res.setHeader("RateLimit-Reset", String(reset));
      if (count > limit) {
        res.setHeader("Retry-After", String(reset));
        res.status(429).json({ error: { message: "Too many requests. Try again later." } });
        return;
      }
    } catch (error) {
      // Availability beats a false lockout: if Redis is briefly unavailable the API
      // keeps serving while /ready reports the degraded dependency.
      console.error("[rate-limit] Redis unavailable; failing open", error instanceof Error ? error.message : String(error));
    }
    next();
  };
}
