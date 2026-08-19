import { Router } from "express";
import { validate, validateParams } from "../../middleware/validate.js";
import { listUsers, login, logout, logoutAll, me, refresh, register, updateUserRole, updateUserStatus } from "./auth.controller.js";
import { authenticate, requireRole } from "./auth.middleware.js";
import { loginSchema, refreshTokenSchema, registerSchema, updateUserRoleSchema, updateUserStatusSchema, userIdParamsSchema } from "./auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refresh);
router.post("/logout", validate(refreshTokenSchema), logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, me);
router.get("/admin/users", authenticate, requireRole("ADMIN"), listUsers);
router.patch("/admin/users/:id/role", authenticate, requireRole("ADMIN"), validateParams(userIdParamsSchema), validate(updateUserRoleSchema), updateUserRole);
router.patch("/admin/users/:id/status", authenticate, requireRole("ADMIN"), validateParams(userIdParamsSchema), validate(updateUserStatusSchema), updateUserStatus);

export default router;
