const LEGACY_STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresConnectionString(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return value;

    const sslMode = url.searchParams.get("sslmode");
    if (sslMode && LEGACY_STRICT_SSL_MODES.has(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return value;
  }
}
