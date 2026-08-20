import { Router } from "express";
import * as controller from "./events.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { createEventSchema, listEventsQuerySchema, updateEventSchema } from "./events.schemas.js";
import { validate, validateQuery } from "../middleware/validate.js";

export const eventsRouter = Router();

eventsRouter.get("/", validateQuery(listEventsQuerySchema), controller.listEvents);
eventsRouter.get("/:id", controller.getEvent);
eventsRouter.post("/", requireAuth, requireRole("ORGANIZER", "ADMIN"), validate(createEventSchema), controller.createEvent);
eventsRouter.patch("/:id", requireAuth, requireRole("ORGANIZER", "ADMIN"), validate(updateEventSchema), controller.updateEvent);
eventsRouter.delete("/:id", requireAuth, requireRole("ORGANIZER", "ADMIN"), controller.deleteEvent);
