import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/HttpError.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = String(res.locals.requestId ?? "");

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues,
        requestId,
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: {
        code: statusCodeToErrorCode(error.statusCode),
        message: error.message,
        requestId,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error?.code === "23505") {
    res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "A unique resource already exists",
        requestId,
      },
    });
    return;
  }

  const internalError = new HttpError(500, "Internal server error");
  console.error({ requestId, error });
  res.status(internalError.statusCode).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: internalError.message,
      requestId,
    },
  });
};

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
