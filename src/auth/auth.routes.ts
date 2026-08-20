import { Router } from "express";
import { config } from "../config.js";
import { redisRateLimit } from "../middleware/redis-rate-limit.js";
import { validate } from "../middleware/validate.js";
import * as controller from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { emptyBodySchema, loginSchema, signupSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.use(
  redisRateLimit({
    prefix: "auth",
    windowSeconds: config.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    limit: config.AUTH_RATE_LIMIT_MAX,
  }),
);
authRouter.post("/signup", validate(signupSchema), controller.signup);
authRouter.post("/login", validate(loginSchema), controller.login);
authRouter.post("/refresh", validate(emptyBodySchema), controller.refresh);
authRouter.get("/me", requireAuth, controller.me);
authRouter.post("/logout", validate(emptyBodySchema), controller.logout);
