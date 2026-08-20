type AdapterConflict = {
  code?: unknown;
  cause?: {
    originalCode?: unknown;
    kind?: unknown;
  };
};

export function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as AdapterConflict;
  return (
    candidate.code === "P2034" ||
    candidate.cause?.originalCode === "40001" ||
    candidate.cause?.kind === "TransactionWriteConflict"
  );
}

export async function withSerializationRetry<T>(
  work: () => Promise<T>,
  maxAttempts = 8,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (!isSerializationConflict(error) || attempt === maxAttempts) throw error;

      const exponential = Math.min(25 * 2 ** (attempt - 1), 400);
      const jitter = Math.floor(Math.random() * 25);
      await new Promise((resolve) => setTimeout(resolve, exponential + jitter));
    }
  }
  throw lastError;
}
