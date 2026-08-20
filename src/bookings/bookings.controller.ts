import type { RequestHandler } from "express";
import type { AuthUser } from "../auth/tokens.js";
import * as bookingsService from "./bookings.service.js";

export const createBooking: RequestHandler = async (req, res) => {
  res.status(201).json(await bookingsService.createBooking(res.locals.user as AuthUser, req.body.eventId));
};

export const getBooking: RequestHandler = async (req, res) => {
  res.json(await bookingsService.getBooking(req.params.id!, res.locals.user as AuthUser));
};

export const cancelBooking: RequestHandler = async (req, res) => {
  res.json(await bookingsService.cancelBooking(req.params.id!, res.locals.user as AuthUser));
};
