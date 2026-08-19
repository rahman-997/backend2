import { Router } from "express";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import { authenticate } from "../auth/auth.middleware.js";
import { createVenue, deleteVenue, getVenue, listVenues, updateVenue } from "./venue.controller.js";
import { createVenueSchema, listVenuesQuerySchema, updateVenueSchema, venueIdParamsSchema } from "./venue.schemas.js";

const router = Router();

router.post("/", authenticate, validate(createVenueSchema), createVenue);
router.get("/", validateQuery(listVenuesQuerySchema), listVenues);
router.get("/:id", validateParams(venueIdParamsSchema), getVenue);
router.patch("/:id", authenticate, validateParams(venueIdParamsSchema), validate(updateVenueSchema), updateVenue);
router.delete("/:id", authenticate, validateParams(venueIdParamsSchema), deleteVenue);

export default router;
