import express from "express";
import { bookingsRouter } from "./bookings/bookings.routes.js";
import { eventsRouter } from "./events/events.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/v1/events", eventsRouter);
app.use("/v1/bookings", bookingsRouter);
app.use(errorHandler);
