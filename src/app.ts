import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { notFound } from "./middleware/notFound.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { env } from "./config/env.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(requestId);
app.use(rateLimit);
app.use(express.json({ limit: "1mb" }));
app.use(routes);
app.use(notFound);
app.use(errorHandler);

export default app;
