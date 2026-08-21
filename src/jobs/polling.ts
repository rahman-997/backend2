export function nextOutboxPollDelay(input: {
  baseMs: number;
  maxIdleMs: number;
  currentMs: number;
  dispatched: number | null;
}): number {
  const baseMs = Math.max(1, input.baseMs);
  const maxIdleMs = Math.max(baseMs, input.maxIdleMs);

  if (input.dispatched === null || input.dispatched > 0) return baseMs;
  return Math.min(maxIdleMs, Math.max(baseMs, input.currentMs * 2));
}
