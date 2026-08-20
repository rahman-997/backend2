import type { RequestHandler } from "express";
import * as eventsService from "./events.service.js";
import type { ListEventsQuery } from "./events.schemas.js";

const CURRENT_ORGANIZER_ID = "00000000-0000-0000-0000-000000000001";

export const createEvent: RequestHandler = async (req, res) => {
  res.status(201).json(await eventsService.createEvent(req.body, CURRENT_ORGANIZER_ID));
};

export const listEvents: RequestHandler = async (_req, res) => {
  res.json(await eventsService.listEvents(res.locals.query as ListEventsQuery));
};

export const getEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.getEvent(req.params.id!));
};

export const updateEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.updateEvent(req.params.id!, req.body));
};

export const deleteEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.deleteEvent(req.params.id!));
};
