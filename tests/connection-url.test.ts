import { describe, expect, it } from "vitest";
import { normalizePostgresConnectionString } from "../src/db/connection-url.js";

describe("normalizePostgresConnectionString", () => {
  it.each(["prefer", "require", "verify-ca"])("upgrades legacy strict sslmode=%s to verify-full", (mode) => {
    const normalized = normalizePostgresConnectionString(
      `postgresql://user:pass@example.com:5432/app?sslmode=${mode}&channel_binding=require`,
    );
    const url = new URL(normalized);

    expect(url.searchParams.get("sslmode")).toBe("verify-full");
    expect(url.searchParams.get("channel_binding")).toBe("require");
  });

  it("preserves explicit verify-full", () => {
    const source = "postgresql://user:pass@example.com:5432/app?sslmode=verify-full";
    const normalized = normalizePostgresConnectionString(source);

    expect(new URL(normalized).searchParams.get("sslmode")).toBe("verify-full");
  });

  it("leaves non-Postgres and malformed values untouched", () => {
    expect(normalizePostgresConnectionString("redis://localhost:6379")).toBe("redis://localhost:6379");
    expect(normalizePostgresConnectionString("not-a-url")).toBe("not-a-url");
  });
});
