import type { Request, Response } from "express";
import { venueService } from "./venue.service.js";
import type { VenueListQuery } from "./venue.repository.js";

type VenueParams = { id: string };

export const createVenue = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json({ data: await venueService.create(req.body) });
};

export const listVenues = async (req: Request, res: Response): Promise<void> => {
  const query = res.locals.validatedQuery as VenueListQuery;
  const result = await venueService.list(query);
  const totalPages = Math.ceil(result.total / query.limit);

  res.status(200).json({
    data: result.data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  });
};

export const getVenue = async (_req: Request, res: Response): Promise<void> => {
  const { id } = res.locals.validatedParams as VenueParams;
  res.status(200).json({ data: await venueService.getById(id) });
};

export const updateVenue = async (req: Request, res: Response): Promise<void> => {
  const { id } = res.locals.validatedParams as VenueParams;
  res.status(200).json({ data: await venueService.update(id, req.body) });
};

export const deleteVenue = async (_req: Request, res: Response): Promise<void> => {
  const { id } = res.locals.validatedParams as VenueParams;
  await venueService.delete(id);
  res.status(204).send();
};
