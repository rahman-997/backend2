import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/HttpError.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.header("x-request-id") ?? undefined;

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues,
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: {
        code: statusCodeToErrorCode(error.statusCode),
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }

  console.error({ error, requestId, method: req.method, path: req.originalUrl });

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      ...(requestId ? { requestId } : {}),
    },
  });
};

function statusCodeToErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400: return "BAD_REQUEST";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "UNPROCESSABLE_ENTITY";
    case 429: return "RATE_LIMITED";
    default: return "HTTP_ERROR";
  }
}
