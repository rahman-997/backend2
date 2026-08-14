import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validate = <T extends ZodType>(schema: T): RequestHandler => {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
};

export const validateQuery = <T extends ZodType>(schema: T): RequestHandler => {
  return (req, res, next) => {
    res.locals.validatedQuery = schema.parse(req.query);
    next();
  };
};

export const validateParams = <T extends ZodType>(schema: T): RequestHandler => {
  return (req, res, next) => {
    res.locals.validatedParams = schema.parse(req.params);
    next();
  };
};
