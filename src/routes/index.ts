import { Router } from "express";
import venueRoutes from "../modules/venues/venue.routes.js";
import healthRoutes from "./health.routes.js";
import { openapi } from "./openapi.js";
const router=Router();
router.use(healthRoutes);
router.get("/openapi.json",(_req,res)=>res.json(openapi));
router.use("/v1/venues",venueRoutes);
export default router;
