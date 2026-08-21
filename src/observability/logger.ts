import { config } from "../config.js";
import { getRequestId } from "./request-context.js";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const REDACTED_KEYS = new Set([
  "authorization",
  "cookie",
  "password",
  "passwordHash",
  "refreshToken",
  "accessToken",
  "token",
  "smtpUrl",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[max-depth]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: config.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) return value.map((entry) => sanitize(entry, depth + 1));
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.has(key) ? "[redacted]" : sanitize(entry, depth + 1);
  }
  return output;
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: "eventify-api",
    message,
    requestId: getRequestId(),
    ...sanitize(fields) as LogFields,
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    if (config.NODE_ENV !== "production") write("debug", message, fields);
  },
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};
