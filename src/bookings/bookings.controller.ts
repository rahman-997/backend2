import type { RequestHandler } from "express";
import * as bookingsService from "./bookings.service.js";

const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000002";

export const createBooking: RequestHandler = async (req, res) => {
  res.status(201).json(await bookingsService.createBooking(CURRENT_USER_ID, req.body.eventId));
};

export const getBooking: RequestHandler = async (req, res) => {
  res.json(await bookingsService.getBooking(req.params.id!));
};

export const cancelBooking: RequestHandler = async (req, res) => {
  res.json(await bookingsService.cancelBooking(req.params.id!));
};
