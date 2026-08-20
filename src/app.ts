import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./auth/auth.routes.js";
import { bookingsRouter } from "./bookings/bookings.routes.js";
import { config } from "./config.js";
import { eventsRouter } from "./events/events.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/v1/auth", authRouter);
app.use("/v1/events", eventsRouter);
app.use("/v1/bookings", bookingsRouter);
app.use(errorHandler);
