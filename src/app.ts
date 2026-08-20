import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./auth/auth.routes.js";
import { bookingsRouter } from "./bookings/bookings.routes.js";
import { config } from "./config.js";
import { databaseHealth } from "./db/health.js";
import { eventsRouter } from "./events/events.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { redisHealth } from "./redis/client.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok", uptime: Math.round(process.uptime()) }));
app.get("/ready", async (_req, res) => {
  const [database, redis] = await Promise.all([databaseHealth(), redisHealth()]);
  const ready = database && redis;
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "degraded", database, redis });
});

app.use("/v1/auth", authRouter);
app.use("/v1/events", eventsRouter);
app.use("/v1/bookings", bookingsRouter);
app.use(errorHandler);
