import type { RequestHandler } from "express";
import type { AuthUser } from "../auth/tokens.js";
import * as eventsService from "./events.service.js";
import type { ListEventsQuery } from "./events.schemas.js";

export const createEvent: RequestHandler = async (req, res) => {
  res.status(201).json(await eventsService.createEvent(req.body, res.locals.user as AuthUser));
};

export const listEvents: RequestHandler = async (_req, res) => {
  res.json(await eventsService.listEvents(res.locals.query as ListEventsQuery));
};

export const getEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.getEvent(req.params.id!));
};

export const updateEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.updateEvent(req.params.id!, req.body, res.locals.user as AuthUser));
};

export const deleteEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.deleteEvent(req.params.id!, res.locals.user as AuthUser));
};
