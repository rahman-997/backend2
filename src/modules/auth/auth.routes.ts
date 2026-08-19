import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { listUsers, login, logout, me, refresh, register } from "./auth.controller.js";
import { authenticate, requireRole } from "./auth.middleware.js";
import { loginSchema, refreshTokenSchema, registerSchema } from "./auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refresh);
router.post("/logout", validate(refreshTokenSchema), logout);
router.get("/me", authenticate, me);
router.get("/admin/users", authenticate, requireRole("ADMIN"), listUsers);

export default router;
