import { describe, expect, it } from "vitest";
import { migrationRetryDelay } from "../scripts/migration-backoff.mjs";

describe("migrationRetryDelay", () => {
  it("uses exponential backoff until the configured cap", () => {
    const options = { baseDelayMs: 5_000, maxDelayMs: 30_000, jitterRatio: 0, random: () => 0.5 };
    expect(migrationRetryDelay({ ...options, attempt: 1 })).toBe(5_000);
    expect(migrationRetryDelay({ ...options, attempt: 2 })).toBe(10_000);
    expect(migrationRetryDelay({ ...options, attempt: 3 })).toBe(20_000);
    expect(migrationRetryDelay({ ...options, attempt: 4 })).toBe(30_000);
    expect(migrationRetryDelay({ ...options, attempt: 5 })).toBe(30_000);
  });

  it("adds bounded jitter so competing deploys do not retry in lockstep", () => {
    const low = migrationRetryDelay({
      attempt: 2,
      baseDelayMs: 5_000,
      maxDelayMs: 30_000,
      jitterRatio: 0.2,
      random: () => 0,
    });
    const high = migrationRetryDelay({
      attempt: 2,
      baseDelayMs: 5_000,
      maxDelayMs: 30_000,
      jitterRatio: 0.2,
      random: () => 1,
    });
    expect(low).toBe(8_000);
    expect(high).toBe(12_000);
  });

  it("normalizes unsafe values to finite safe defaults", () => {
    expect(
      migrationRetryDelay({
        attempt: Number.NaN,
        baseDelayMs: -1,
        maxDelayMs: Number.POSITIVE_INFINITY,
        jitterRatio: 2,
        random: () => -10,
      }),
    ).toBe(5_000);
  });
});
