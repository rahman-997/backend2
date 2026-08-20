import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as controller from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { emptyBodySchema, loginSchema, signupSchema } from "./auth.schemas.js";
import { validate } from "../middleware/validate.js";

export const authRouter = Router();

authRouter.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
authRouter.post("/signup", validate(signupSchema), controller.signup);
authRouter.post("/login", validate(loginSchema), controller.login);
authRouter.post("/refresh", validate(emptyBodySchema), controller.refresh);
authRouter.get("/me", requireAuth, controller.me);
authRouter.post("/logout", validate(emptyBodySchema), controller.logout);
