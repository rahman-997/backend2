import app from "./app.js";
import { env } from "./config/env.js";

const host = process.env.HOST ?? "0.0.0.0";
const server = app.listen(env.PORT, host, () => {
  console.log(`API listening on http://${host}:${env.PORT}`);
});

const shutdown = (signal: string): void => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close((error) => {
    if (error) {
      console.error("Graceful shutdown failed", error);
      process.exitCode = 1;
      return;
    }
    process.exitCode = 0;
  });
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
