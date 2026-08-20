import { Router } from "express";
import * as controller from "./bookings.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createBookingSchema } from "./bookings.schemas.js";
import { validate } from "../middleware/validate.js";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireAuth, validate(createBookingSchema), controller.createBooking);
bookingsRouter.get("/:id", requireAuth, controller.getBooking);
bookingsRouter.delete("/:id", requireAuth, controller.cancelBooking);
