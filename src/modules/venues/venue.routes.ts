import { Router } from "express";
import { createVenue, deleteVenue, getVenue, listVenues, updateVenue } from "./venue.controller.js";
import { createVenueSchema, listVenuesQuerySchema, updateVenueSchema, venueIdParamsSchema } from "./venue.schemas.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";

const router = Router();

router.post("/", validate(createVenueSchema), createVenue);
router.get("/", validateQuery(listVenuesQuerySchema), listVenues);
router.get("/:id", validateParams(venueIdParamsSchema), getVenue);
router.patch("/:id", validateParams(venueIdParamsSchema), validate(updateVenueSchema), updateVenue);
router.delete("/:id", validateParams(venueIdParamsSchema), deleteVenue);

export default router;
