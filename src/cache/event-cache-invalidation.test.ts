import type { Redis } from "ioredis";
import { describe, expect, it, vi } from "vitest";
import { invalidateEventCache } from "./event-cache-invalidation.js";


describe("invalidateEventCache", () => {
  it("invalidates the event detail and bumps the list version using the provided connection", async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const chain = {
      del: vi.fn().mockReturnThis(),
      incr: vi.fn().mockReturnThis(),
      exec,
    };
    const multi = vi.fn(() => chain);
    const connection = { multi } as unknown as Redis;

    await invalidateEventCache(connection, "event-123");

    expect(multi).toHaveBeenCalledTimes(1);
    expect(chain.del).toHaveBeenCalledWith("eventify:cache:event:event-123");
    expect(chain.incr).toHaveBeenCalledWith("eventify:cache:events:version");
    expect(exec).toHaveBeenCalledTimes(1);
  });
});
