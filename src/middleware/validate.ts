import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validate = <T extends ZodType>(schema: T): RequestHandler => {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
};

export const validateQuery = <T extends ZodType>(schema: T): RequestHandler => {
  return (req, _res, next) => {
    req.query = schema.parse(req.query) as typeof req.query;
    next();
  };
};

export const validateParams = <T extends ZodType>(schema: T): RequestHandler => {
  return (req, _res, next) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };
};
