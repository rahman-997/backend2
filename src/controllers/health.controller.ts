import type { RequestHandler } from "express";
import { HttpError } from "../errors/HttpError.js";
import { venueService } from "../modules/venues/venue.service.js";

export const health: RequestHandler = (_req, res) => {
  res.status(200).json({ status: "ok" });
};

export const readiness: RequestHandler = async (_req, res) => {
  try {
    await venueService.health();
    res.status(200).json({ status: "ready" });
  } catch {
    throw new HttpError(503, "Service is not ready");
  }
};
