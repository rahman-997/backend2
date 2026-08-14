import type { RequestHandler } from "express";
import { venueService } from "../modules/venues/venue.service.js";

export const health: RequestHandler = (_req, res) => {
  res.status(200).json({ status: "ok" });
};

export const readiness: RequestHandler = async (_req, res) => {
  await venueService.health();
  res.status(200).json({ status: "ready" });
};
