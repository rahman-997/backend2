import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../observability/logger.js";
import { recordHttpRequest } from "../observability/metrics.js";
import { runWithRequestContext } from "../observability/request-context.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function requestIdFromHeader(value: string | undefined): string {
  return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

export const requestObservability: RequestHandler = (req, res, next) => {
  const requestId = requestIdFromHeader(req.get("x-request-id"));
  const startedAt = process.hrtime.bigint();
  res.setHeader("x-request-id", requestId);

  runWithRequestContext({ requestId }, () => {
    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const route = req.originalUrl.split("?")[0] || req.path || "/";
      recordHttpRequest({ method: req.method, route, status: res.statusCode, durationMs });

      const fields = {
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        contentLength: res.getHeader("content-length") ?? undefined,
      };
      if (res.statusCode >= 500) logger.error("http.request", fields);
      else if (res.statusCode >= 400) logger.warn("http.request", fields);
      else logger.info("http.request", fields);
    });
    next();
  });
};
