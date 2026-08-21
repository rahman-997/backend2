import { describe, expect, it } from "vitest";
import { nextOutboxPollDelay } from "../src/jobs/polling.js";

describe("nextOutboxPollDelay", () => {
  const base = 2_000;
  const max = 15_000;

  it("backs off exponentially while the outbox is idle", () => {
    expect(nextOutboxPollDelay({ baseMs: base, maxIdleMs: max, currentMs: 2_000, dispatched: 0 })).toBe(4_000);
    expect(nextOutboxPollDelay({ baseMs: base, maxIdleMs: max, currentMs: 4_000, dispatched: 0 })).toBe(8_000);
    expect(nextOutboxPollDelay({ baseMs: base, maxIdleMs: max, currentMs: 8_000, dispatched: 0 })).toBe(15_000);
    expect(nextOutboxPollDelay({ baseMs: base, maxIdleMs: max, currentMs: 15_000, dispatched: 0 })).toBe(15_000);
  });

  it("returns to the fast interval as soon as work is dispatched", () => {
    expect(nextOutboxPollDelay({ baseMs: base, maxIdleMs: max, currentMs: 15_000, dispatched: 1 })).toBe(base);
  });

  it("retries quickly after a polling failure", () => {
    expect(nextOutboxPollDelay({ baseMs: base, maxIdleMs: max, currentMs: 15_000, dispatched: null })).toBe(base);
  });

  it("never chooses an idle ceiling below the base interval", () => {
    expect(nextOutboxPollDelay({ baseMs: 5_000, maxIdleMs: 1_000, currentMs: 5_000, dispatched: 0 })).toBe(5_000);
  });
});
