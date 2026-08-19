import { Router } from "express";
import { validateQuery } from "../../middleware/validate.js";
import { authenticate, requireRole } from "../auth/auth.middleware.js";
import { listAuditLogs } from "./audit.controller.js";
import { auditListQuerySchema } from "./audit.schema.js";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN"), validateQuery(auditListQuerySchema), listAuditLogs);

export default router;
