import { Router } from "express";
import * as controller from "./events.controller.js";
import { createEventSchema, listEventsQuerySchema, updateEventSchema } from "./events.schemas.js";
import { validate, validateQuery } from "../middleware/validate.js";

export const eventsRouter = Router();

eventsRouter.post("/", validate(createEventSchema), controller.createEvent);
eventsRouter.get("/", validateQuery(listEventsQuerySchema), controller.listEvents);
eventsRouter.get("/:id", controller.getEvent);
eventsRouter.patch("/:id", validate(updateEventSchema), controller.updateEvent);
eventsRouter.delete("/:id", controller.deleteEvent);
