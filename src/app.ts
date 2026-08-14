import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(routes);
app.use(errorHandler);

export default app;
