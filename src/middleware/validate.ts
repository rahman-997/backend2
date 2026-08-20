import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../errors/http-error.js";

export const validate = (schema: ZodType): RequestHandler => (req, _res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid request body", parsed.error.flatten());
  }
  req.body = parsed.data;
  next();
};

export const validateQuery = (schema: ZodType): RequestHandler => (req, res, next) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid query parameters", parsed.error.flatten());
  }
  res.locals.query = parsed.data;
  next();
};
