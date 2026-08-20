import type { ErrorRequestHandler } from "express";
import { HttpError } from "../errors/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details });
    return;
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};
