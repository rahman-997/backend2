import { Router } from "express";
import venueRoutes from "../modules/venues/venue.routes.js";
import healthRoutes from "./health.routes.js";

const router = Router();

router.use(healthRoutes);
router.use("/v1/venues", venueRoutes);

export default router;
