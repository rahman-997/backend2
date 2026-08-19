import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import venueRoutes from "../modules/venues/venue.routes.js";
import healthRoutes from "./health.routes.js";
import docsRoutes from "./docs.js";
import { openapi } from "./openapi.js";

const router = Router();

router.use(healthRoutes);
router.use(docsRoutes);
router.get("/openapi.json", (_req, res) => res.json(openapi));
router.use("/v1/auth", authRoutes);
router.use("/v1/venues", venueRoutes);

export default router;
