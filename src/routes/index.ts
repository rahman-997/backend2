import { Router } from "express";
import venueRoutes from "../modules/venues/venue.routes.js";

const router = Router();
router.use("/v1/venues", venueRoutes);

export default router;
