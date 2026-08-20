import type { RequestHandler } from "express";
import type { AuthUser } from "../auth/tokens.js";
import * as eventsService from "./events.service.js";
import type { ListEventsQuery } from "./events.schemas.js";

function routeId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const createEvent: RequestHandler = async (req, res) => {
  res.status(201).json(await eventsService.createEvent(req.body, res.locals.user as AuthUser));
};

export const listEvents: RequestHandler = async (_req, res) => {
  res.json(await eventsService.listEvents(res.locals.query as ListEventsQuery));
};

export const getEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.getEvent(routeId(req.params.id)));
};

export const updateEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.updateEvent(routeId(req.params.id), req.body, res.locals.user as AuthUser));
};

export const deleteEvent: RequestHandler = async (req, res) => {
  res.json(await eventsService.deleteEvent(routeId(req.params.id), res.locals.user as AuthUser));
};
