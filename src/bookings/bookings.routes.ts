import { Router } from "express";
import * as controller from "./bookings.controller.js";
import { createBookingSchema } from "./bookings.schemas.js";
import { validate } from "../middleware/validate.js";

export const bookingsRouter = Router();

bookingsRouter.post("/", validate(createBookingSchema), controller.createBooking);
bookingsRouter.get("/:id", controller.getBooking);
bookingsRouter.delete("/:id", controller.cancelBooking);
