import { Router } from "express";
import { health, readiness } from "../controllers/health.controller.js";

const router = Router();

router.get("/health", health);
router.get("/ready", readiness);

export default router;
