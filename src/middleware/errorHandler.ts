import type { ErrorRequestHandler, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/HttpError.js";

type ErrorPayload = {
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = String(res.locals.requestId ?? "");

  if (error instanceof ZodError) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: error.issues,
      requestId,
    });
    return;
  }

  if (error instanceof HttpError) {
    sendError(res, error.statusCode, {
      code: statusCodeToErrorCode(error.statusCode),
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
      requestId,
    });
    return;
  }

  if (isPostgresUniqueViolation(error)) {
    sendError(res, 409, {
      code: "CONFLICT",
      message: "A unique resource already exists",
      requestId,
    });
    return;
  }

  const internalError = new HttpError(500, "Internal server error");
  console.error({ requestId, error });
  sendError(res, internalError.statusCode, {
    code: statusCodeToErrorCode(internalError.statusCode),
    message: internalError.message,
    requestId,
  });
};

function sendError(res: Response, statusCode: number, payload: ErrorPayload): void {
  res.status(statusCode).json({ error: payload });
}

function isPostgresUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function statusCodeToErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 500:
      return "INTERNAL_SERVER_ERROR";
    default:
      return "HTTP_ERROR";
  }
}
