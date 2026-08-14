import type { Request, Response } from "express";
import { venueService } from "./venue.service.js";

export const createVenue = (req: Request, res: Response): void => {
  const venue = venueService.create(req.body);
  res.status(201).json({ data: venue });
};

export const listVenues = (req: Request, res: Response): void => {
  const { limit } = req.query as unknown as { limit: number };
  res.status(200).json({ data: venueService.list(limit) });
};

export const getVenue = (req: Request, res: Response): void => {
  res.status(200).json({ data: venueService.getById(req.params.id) });
};

export const updateVenue = (req: Request, res: Response): void => {
  res.status(200).json({ data: venueService.update(req.params.id, req.body) });
};

export const deleteVenue = (req: Request, res: Response): void => {
  venueService.delete(req.params.id);
  res.status(204).send();
};
