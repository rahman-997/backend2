function finiteNonNegative(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function migrationRetryDelay({
  attempt,
  baseDelayMs,
  maxDelayMs,
  jitterRatio = 0.2,
  random = Math.random,
}) {
  const safeAttempt = Math.max(1, Math.trunc(finiteNonNegative(attempt, 1)));
  const safeBase = finiteNonNegative(baseDelayMs, 5_000);
  const safeMax = Math.max(safeBase, finiteNonNegative(maxDelayMs, 30_000));
  const safeJitter = Math.min(1, finiteNonNegative(jitterRatio, 0.2));
  const exponential = Math.min(safeMax, safeBase * 2 ** (safeAttempt - 1));
  const unit = Math.min(1, Math.max(0, finiteNonNegative(random(), 0.5)));
  const jitter = exponential * safeJitter * (unit * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}
